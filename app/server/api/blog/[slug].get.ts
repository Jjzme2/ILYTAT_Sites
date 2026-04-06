/**
 * GET /api/blog/:slug
 * Returns a single published blog post by slug.
 */
import { firestoreRunQuery } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Missing slug' })

  // Order by the same field we filter on — avoids needing a composite index.
  const posts = await firestoreRunQuery({
    collectionId: 'blog_posts',
    whereField: 'slug',
    whereOp: 'EQUAL',
    whereValue: slug,
    orderByField: 'slug',
    limit: 1,
  })

  const post = posts[0]
  if (!post || post.status !== 'published') {
    throw createError({ statusCode: 404, message: 'Post not found' })
  }

  return post
})
