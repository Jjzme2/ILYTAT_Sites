/**
 * GET /api/testimonials
 *
 * Returns visible testimonials ordered by `order` field.
 *
 * ── Firestore collection: `testimonials` ─────────────────────────────────────
 * Add a document for each testimonial with these fields:
 *
 *   name          string    Client first name (or full)   "Sarah M."
 *   businessName  string    Their business name           "Sarah's Salon"
 *   quote         string    The testimonial text          "I had a site up in a week…"
 *   visible       boolean   Show/hide toggle              true
 *   order         number    Sort order (lower = first)    1
 *
 * To show: set visible: true. To hide: set visible: false.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

interface FirestoreDoc {
  name: string
  fields: Record<string, unknown>
}

interface Testimonial {
  id: string
  name: string
  businessName: string
  quote: string
  visible: boolean
  order: number
}

export default defineEventHandler(async () => {
  try {
    const res = await firestoreRequest('GET', 'testimonials')
    const docs: FirestoreDoc[] = res.documents || []

    return docs
      .map(doc => ({
        id: doc.name.split('/').pop() as string,
        ...(fromFirestoreFields(doc.fields) as Omit<Testimonial, 'id'>),
      }))
      .filter(t => t.visible)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  }
  catch {
    return []
  }
})
