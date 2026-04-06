/**
 * GET /api/admin/blog
 * Admin: returns all posts (draft + published), newest first.
 */
import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

interface FirestoreDoc { name: string; fields: Record<string, unknown> }

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const res = await firestoreRequest('GET', 'blog_posts')
  const docs: FirestoreDoc[] = res.documents || []

  return docs
    .map(doc => ({
      id: doc.name.split('/').pop() as string,
      ...(fromFirestoreFields(doc.fields) as Record<string, unknown>),
    }))
    .sort((a, b) => {
      const aDate = new Date((a.updatedAt || a.createdAt) as string).getTime()
      const bDate = new Date((b.updatedAt || b.createdAt) as string).getTime()
      return bDate - aDate
    })
})
