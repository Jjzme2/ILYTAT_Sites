/**
 * GET /api/admin/health
 *
 * Server-side Firestore connectivity check.
 * Tests: service account token, write, read-back, cleanup for each collection.
 * Call this from /admin (logged-in only) to diagnose missing env vars or auth issues.
 */

import { firestoreRequest, toFirestoreFields, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

interface CollectionResult {
  collection: string
  readable: boolean
  docCount?: number
  error?: string
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const results: CollectionResult[] = []
  let tokenOk = false
  let tokenError: string | undefined

  // 1. Validate service account env vars are present
  const missingVars: string[] = []
  if (!config.firebaseClientEmail)  missingVars.push('FIREBASE_CLIENT_EMAIL')
  if (!config.firebasePrivateKey)   missingVars.push('FIREBASE_PRIVATE_KEY')
  if (!config.public.firebaseProjectId) missingVars.push('FIREBASE_PROJECT_ID')

  if (missingVars.length > 0) {
    return {
      ok: false,
      tokenOk: false,
      tokenError: `Missing env vars: ${missingVars.join(', ')}`,
      collections: [],
      missingVars,
    }
  }

  // 2. Test a real Firestore read — this exercises the full JWT + OAuth path
  try {
    await firestoreRequest('GET', 'promotions')
    tokenOk = true
  }
  catch (err: unknown) {
    tokenError = err instanceof Error ? err.message : String(err)
  }

  if (!tokenOk) {
    return { ok: false, tokenOk, tokenError, collections: [] }
  }

  // 3. Check each collection (read-only)
  const collections = ['promotions', 'projects', 'testimonials', 'inquiries', 'orders', 'payment_failures']

  for (const col of collections) {
    try {
      const res = await firestoreRequest('GET', col)
      const docs = res.documents || []
      results.push({ collection: col, readable: true, docCount: docs.length })
    }
    catch (err: unknown) {
      results.push({
        collection: col,
        readable: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // 4. Round-trip write test using a dedicated _healthcheck collection
  let writeOk = false
  let writeError: string | undefined
  let testDocId: string | undefined

  try {
    const written = await firestoreRequest('POST', '_healthcheck', {
      fields: toFirestoreFields({
        test: true,
        ts: new Date().toISOString(),
      }),
    })
    testDocId = written.name?.split('/').pop()
    // Read it back
    const readBack = await firestoreRequest('GET', `_healthcheck/${testDocId}`)
    const parsed = fromFirestoreFields(readBack.fields || {})
    writeOk = parsed.test === true
  }
  catch (err: unknown) {
    writeError = err instanceof Error ? err.message : String(err)
  }
  finally {
    // Clean up test doc
    if (testDocId) {
      await firestoreRequest('DELETE', `_healthcheck/${testDocId}`).catch(() => {})
    }
  }

  const allCollectionsOk = results.every(r => r.readable)

  return {
    ok: tokenOk && writeOk && allCollectionsOk,
    tokenOk,
    tokenError,
    writeOk,
    writeError,
    collections: results,
    projectId: config.public.firebaseProjectId,
  }
})
