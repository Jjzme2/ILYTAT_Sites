/**
 * POST /api/admin/blog
 * Admin: create a new blog post.
 */
import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, toFirestoreFields, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)

  if (!body.title?.trim()) throw createError({ statusCode: 400, message: 'title is required' })
  if (!body.slug?.trim()) throw createError({ statusCode: 400, message: 'slug is required' })

  const now = new Date().toISOString()

  const data = {
    title: String(body.title).trim(),
    slug: String(body.slug).trim(),
    excerpt: String(body.excerpt || '').trim(),
    content: String(body.content || ''),
    coverImage: String(body.coverImage || ''),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    status: body.status === 'published' ? 'published' : 'draft',
    style: {
      accentColor: body.style?.accentColor || '#6366f1',
      heroStyle: body.style?.heroStyle || 'gradient',
      fontStyle: body.style?.fontStyle || 'sans',
    },
    authorName: String(body.authorName || 'ILYTAT').trim(),
    publishedAt: body.status === 'published' ? now : null,
    createdAt: now,
    updatedAt: now,
  }

  const res = await firestoreRequest('POST', 'blog_posts', { fields: toFirestoreFields(data as Record<string, unknown>) })

  return {
    id: res.name?.split('/').pop() as string,
    ...fromFirestoreFields(res.fields || {}),
  }
})
