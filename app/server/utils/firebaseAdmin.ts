import crypto from 'node:crypto'

// Server-side Firestore access using REST API and Service Account JWT
// (avoids needing firebase-admin in edge/serverless environments while bypassing blocked API Key rules)

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const config = useRuntimeConfig();
  const clientEmail = config.firebaseClientEmail;
  let privateKey = config.firebasePrivateKey || '';

  // Clean the private key — in prod environments it often has surrounding quotes or missing linebreaks
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }
  
  // Replace explicit "\n" literal characters with actual linebreaks
  privateKey = privateKey.replace(/\\n/g, '\n');

  // If there are still no actual linebreaks but it contains BEGIN and END, try to reformat
  if (!privateKey.includes('\n')) {
    const beginStr = "-----BEGIN PRIVATE KEY-----";
    const endStr = "-----END PRIVATE KEY-----";
    if (privateKey.includes(beginStr) && privateKey.includes(endStr)) {
      const core = privateKey
        .substring(privateKey.indexOf(beginStr) + beginStr.length, privateKey.indexOf(endStr))
        .replace(/\s+/g, '');
      const lines = core.match(/.{1,64}/g) || [];
      privateKey = `${beginStr}\n${lines.join('\n')}\n${endStr}\n`;
    }
  }

  if (!clientEmail || !privateKey) {
    console.error('[Firebase] Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in environment');
    throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in environment');
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
    scope: 'https://www.googleapis.com/auth/datastore'
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedClaimSet = Buffer.from(JSON.stringify(claimSet)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey).toString('base64url');

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('[Firebase] Failed to generate Google OAuth token:', tokenData);
    throw new Error(`Failed to generate Google OAuth token: ${JSON.stringify(tokenData)}`);
  }

  cachedToken = tokenData.access_token;
  // Expire 5 minutes early
  tokenExpiresAt = Date.now() + (tokenData.expires_in - 300) * 1000;

  return cachedToken;
}

export async function firestoreRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: object,
) {
  const config = useRuntimeConfig()
  const projectId = config.public.firebaseProjectId
  
  const token = await getAccessToken()
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`

  const res = await fetch(url, {
    method,
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let data;
  try {
    data = await res.json();
  } catch (err) {
    const text = await res.text().catch(() => '');
    console.error(`[Firebase] Non-JSON response from Firestore: ${text}`);
    throw new Error(`Firestore expected JSON but got text: ${res.status}`);
  }

  if (!res.ok) {
    console.error(`[Firebase] Firestore API error (${res.status}):`, JSON.stringify(data, null, 2));
    throw new Error(`Firestore error: ${res.status} ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Run a structured query against a top-level collection.
 * Supports a single field filter (e.g. createdAt >= since) + ordering + limit.
 * Returns plain objects with an `id` field added.
 */
export async function firestoreRunQuery(opts: {
  collectionId: string
  whereField:   string
  whereOp:      'GREATER_THAN_OR_EQUAL' | 'LESS_THAN_OR_EQUAL' | 'EQUAL' | 'GREATER_THAN'
  whereValue:   string | number | boolean
  orderByField: string
  orderByDir?:  'ASCENDING' | 'DESCENDING'
  limit?:       number
}): Promise<Array<Record<string, unknown>>> {
  const config    = useRuntimeConfig()
  const projectId = config.public.firebaseProjectId
  const token     = await getAccessToken()

  const body = {
    structuredQuery: {
      from: [{ collectionId: opts.collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: opts.whereField },
          op:    opts.whereOp,
          value: typeof opts.whereValue === 'string'
            ? { stringValue:  opts.whereValue }
            : typeof opts.whereValue === 'number'
              ? { doubleValue: opts.whereValue }
              : { booleanValue: opts.whereValue },
        },
      },
      orderBy: [{ field: { fieldPath: opts.orderByField }, direction: opts.orderByDir ?? 'DESCENDING' }],
      limit: opts.limit ?? 500,
    },
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Firestore runQuery error: ${res.status} ${err}`)
  }

  const rows: Array<{ document?: { name: string; fields: Record<string, unknown> } }> = await res.json()

  return rows
    .filter(r => r.document)
    .map(r => ({
      id: r.document!.name.split('/').pop() as string,
      ...fromFirestoreFields(r.document!.fields),
    }))
}

// Convert Firestore REST format to plain objects
export function fromFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    result[key] = unwrapField(value as Record<string, unknown>)
  }
  return result
}

function unwrapField(field: Record<string, unknown>): unknown {
  if ('stringValue' in field) return field.stringValue
  if ('integerValue' in field) return Number(field.integerValue)
  if ('doubleValue' in field) return field.doubleValue
  if ('booleanValue' in field) return field.booleanValue
  if ('timestampValue' in field) return new Date(field.timestampValue as string)
  if ('nullValue' in field) return null
  if ('mapValue' in field)
    return fromFirestoreFields((field.mapValue as { fields: Record<string, unknown> }).fields || {})
  if ('arrayValue' in field) {
    const arr = (field.arrayValue as { values?: unknown[] }).values || []
    return arr.map((v) => unwrapField(v as Record<string, unknown>))
  }
  return null
}

export function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = wrapField(value)
  }
  return fields
}

function wrapField(value: unknown): unknown {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(wrapField) } }
  if (typeof value === 'object') return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } }
  return { stringValue: String(value) }
}
