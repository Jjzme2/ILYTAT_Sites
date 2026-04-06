/**
 * GET /api/admin/blog/preview/:id
 * Admin: returns a single post by Firestore doc ID regardless of status.
 * Used by the draft preview page so admins can see drafts in the real page layout.
 */
import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing post id' })

  const res = await firestoreRequest('GET', `blog_posts/${id}`)
  if (!res.fields) throw createError({ statusCode: 404, message: 'Post not found' })

  return {
    id,
    ...fromFirestoreFields(res.fields),
  }
})
