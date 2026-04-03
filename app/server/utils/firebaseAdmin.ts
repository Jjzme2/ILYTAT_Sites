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
  const privateKey = (config.firebasePrivateKey || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
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

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Firestore error: ${res.status} ${err}`)
  }

  return res.json()
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
