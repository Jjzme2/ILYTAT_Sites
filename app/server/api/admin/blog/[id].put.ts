/**
 * PUT /api/admin/blog/:id
 * Admin: update an existing blog post.
 */
import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, toFirestoreFields, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing post id' })

  const body = await readBody(event)
  if (!body.title?.trim()) throw createError({ statusCode: 400, message: 'title is required' })
  if (!body.slug?.trim()) throw createError({ statusCode: 400, message: 'slug is required' })

  const now = new Date().toISOString()

  // Fetch current post to preserve createdAt and publishedAt
  const current = await firestoreRequest('GET', `blog_posts/${id}`)
  const currentFields = fromFirestoreFields(current.fields || {})

  const wasPublished = currentFields.status === 'published'
  const nowPublished = body.status === 'published'

  const data = {
    title: String(body.title).trim(),
    slug: String(body.slug).trim(),
    excerpt: String(body.excerpt || '').trim(),
    content: String(body.content || ''),
    coverImage: String(body.coverImage || ''),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    status: nowPublished ? 'published' : 'draft',
    style: {
      accentColor: body.style?.accentColor || '#6366f1',
      heroStyle: body.style?.heroStyle || 'gradient',
      fontStyle: body.style?.fontStyle || 'sans',
    },
    authorName: String(body.authorName || 'ILYTAT').trim(),
    // Set publishedAt only when first publishing
    publishedAt: nowPublished
      ? (wasPublished ? currentFields.publishedAt : now)
      : null,
    createdAt: currentFields.createdAt || now,
    updatedAt: now,
  }

  const maskParams = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')
  const res = await firestoreRequest(
    'PATCH',
    `blog_posts/${id}?${maskParams}`,
    { fields: toFirestoreFields(data as Record<string, unknown>) },
  )

  return {
    id,
    ...fromFirestoreFields(res.fields || {}),
  }
})
