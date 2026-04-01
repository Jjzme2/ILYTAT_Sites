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
  try {
    const res = await firestoreRequest('GET', 'promotions')
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
  catch {
    return null
  }
})
