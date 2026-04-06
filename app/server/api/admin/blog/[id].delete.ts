/**
 * DELETE /api/admin/blog/:id
 * Admin: permanently delete a blog post.
 */
import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing post id' })

  await firestoreRequest('DELETE', `blog_posts/${id}`)
  return { ok: true }
})
