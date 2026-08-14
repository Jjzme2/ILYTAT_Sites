/**
 * GET /api/promotion
 *
 * Returns the currently active promotion, or null if none.
 *
 * ── Firestore collection: `promotions` ────────────────────────────────────
 * Add a document for each promotion with these fields:
 *
 *   message    string    Banner text             "20% off new LLC sites this month"
 *   ctaText    string    Button label (opt)      "Claim offer"
 *   ctaUrl     string    Button link (opt)       "#contact"
 *   active     boolean   Master switch           true
 *   expiresAt  string    ISO date string (opt)   "2026-05-01T00:00:00Z"
 *
 * Only one promotion is shown at a time — the first active, non-expired one.
 * To rotate promos: set `active: false` on the old one, add a new document.
 * To kill the banner immediately: set `active: false`.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'
import { log } from '~/server/utils/logger'

/**
 * How long this endpoint will wait on Firestore before giving up.
 *
 * The homepage awaits this during SSR — deliberately, because the banner sits
 * above the fold in normal flow and loading it lazily would shift the page as
 * it popped in. The cost of that decision is that a slow Firestore read holds
 * up the entire homepage render, which is what triggered the slow-response
 * alert.
 *
 * A promotional banner is the most discardable thing on the page and there is
 * already a committed fallback for it, so waiting is never worth it. Two and a
 * half seconds is far above a healthy read (which is well under one) and far
 * below anything a visitor would tolerate.
 */
const FIRESTORE_BUDGET_MS = 2500

interface FirestoreDoc {
  name: string
  fields: Record<string, unknown>
}

interface Promotion {
  id: string
  message: string
  ctaText?: string
  ctaUrl?: string
  active: boolean
  expiresAt?: string
}

export default defineEventHandler(async () => {
  const startedAt = Date.now()
  try {
    // Raced rather than passed a signal, because the slow part is often the
    // OAuth token exchange that happens *before* the Firestore call — a signal
    // on the data request alone would not bound it. The dangling request is
    // acceptable: it is a read, and the instance is short-lived.
    const res = await Promise.race([
      firestoreRequest('GET', 'promotions'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('promotion lookup exceeded its budget')), FIRESTORE_BUDGET_MS),
      ),
    ])
    const docs: FirestoreDoc[] = res.documents || []
    const now = new Date()

    const active = docs
      .map(doc => ({
        id: doc.name.split('/').pop() as string,
        ...(fromFirestoreFields(doc.fields) as Omit<Promotion, 'id'>),
      }))
      .find((p) => {
        if (!p.active) return false
        if (p.expiresAt && new Date(p.expiresAt) < now) return false
        return true
      })

    return active ?? null
  }
  catch (err) {
    // Returning null is the right behaviour — the homepage renders its
    // committed fallback banner and the visitor sees nothing wrong. But it used
    // to be a bare `catch { return null }`, so a permanently broken promotions
    // read looked identical to "no promotion is running" and would never have
    // been noticed.
    await log('warn', 'api', 'Promotion lookup failed — serving the fallback banner', {
      error: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - startedAt,
      budgetMs: FIRESTORE_BUDGET_MS,
    })
    return null
  }
})
