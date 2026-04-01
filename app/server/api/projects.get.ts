/**
 * GET /api/projects
 *
 * Returns visible portfolio projects, sorted by `order` (ascending).
 *
 * ── Firestore collection: `projects` ──────────────────────────────────────
 * Add a document for each completed project with these fields:
 *
 *   title        string   Display name            "Jane's Bakery"
 *   description  string   One-line summary        "Full 5-page site for a local bakery"
 *   industry     string   Category label          "Restaurant" | "Trades" | "Retail" | …
 *   url          string   Live site URL (opt)     "https://janesbakery.com"
 *   imageUrl     string   Screenshot URL (opt)    (Firebase Storage or any CDN URL)
 *   order        number   Sort position           1, 2, 3 …
 *   visible      boolean  Show on site?           true
 * ──────────────────────────────────────────────────────────────────────────
 */

import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

interface FirestoreDoc {
  name: string
  fields: Record<string, unknown>
}

export default defineEventHandler(async () => {
  try {
    const res = await firestoreRequest('GET', 'projects')
    const docs: FirestoreDoc[] = res.documents || []

    return docs
      .map(doc => ({
        id: doc.name.split('/').pop() as string,
        ...(fromFirestoreFields(doc.fields) as {
          title: string
          description: string
          industry: string
          url?: string
          imageUrl?: string
          order: number
          visible: boolean
        }),
      }))
      .filter(p => p.visible)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  catch {
    // Return empty array rather than a 500 — portfolio section degrades gracefully
    return []
  }
})
