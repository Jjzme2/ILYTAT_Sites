/**
 * GET /api/admin/health
 *
 * Server-side Firestore connectivity check, plus AI provider configuration.
 * Tests: service account token, write, read-back, cleanup for each collection.
 * Call this from /admin (logged-in only) to diagnose missing env vars or auth issues.
 *
 * The AI section reports which provider is configured and which model it will
 * use, without ever returning the key. Not knowing this was what made the blog
 * generation failure hard to diagnose — the only way to find out whether a key
 * was set was to trigger a generation and read the error.
 */

import { firestoreRequest, toFirestoreFields, fromFirestoreFields } from '~/server/utils/firebaseAdmin'
import { requireAdmin } from '~/server/utils/verifyAdmin'

interface CollectionResult {
  collection: string
  readable: boolean
  docCount?: number
  error?: string
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
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
      ai: aiStatus(config),
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
    ai: aiStatus(config),
  }
})

/**
 * Which AI provider will actually be used, and with what model.
 * Never returns the key itself — only whether one is present.
 */
function aiStatus(config: ReturnType<typeof useRuntimeConfig>) {
  const openrouter = Boolean(config.openrouterApiKey || config.opencloudApiKey)
  const gemini = Boolean(config.geminiApiKey)

  return {
    configured: openrouter || gemini,
    primary: openrouter ? 'OpenRouter' : gemini ? 'Gemini' : null,
    model: openrouter
      ? (config.openrouterModel || 'google/gemini-2.5-flash')
      : gemini
        ? (config.geminiModel || 'gemini-2.5-flash')
        : null,
    fallback: openrouter && gemini ? 'Gemini' : null,
    dailyCap: config.aiDailyRequestCap,
    hint: openrouter || gemini
      ? null
      : 'Set NUXT_OPENROUTER_API_KEY in Vercel (runtime, no redeploy needed).',
  }
}
