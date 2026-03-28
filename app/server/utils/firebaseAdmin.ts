// Server-side Firestore access using REST API
// (avoids needing firebase-admin in edge/serverless environments)

export async function firestoreRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: object,
) {
  const config = useRuntimeConfig()
  const projectId = config.public.firebaseProjectId
  const apiKey = config.public.firebaseApiKey

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}`

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
