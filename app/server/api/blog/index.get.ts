/**
 * GET /api/blog
 * Returns all published blog posts, newest first.
 */
import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

interface FirestoreDoc { name: string; fields: Record<string, unknown> }

export default defineEventHandler(async () => {
  try {
    const res = await firestoreRequest('GET', 'blog_posts')
    const docs: FirestoreDoc[] = res.documents || []

    return docs
      .map(doc => ({
        id: doc.name.split('/').pop() as string,
        ...(fromFirestoreFields(doc.fields) as Record<string, unknown>),
      }))
      .filter(p => p.status === 'published')
      .sort((a, b) => {
        const aDate = a.publishedAt instanceof Date ? a.publishedAt.getTime() : new Date(a.publishedAt as string).getTime()
        const bDate = b.publishedAt instanceof Date ? b.publishedAt.getTime() : new Date(b.publishedAt as string).getTime()
        return bDate - aDate
      })
  }
  catch {
    return []
  }
})
