/**
 * GET /api/blog/:slug/related
 *
 * Up to three published posts that share tags with this one, best match first.
 *
 * Deliberately its own endpoint rather than filtering `/api/blog` in the
 * browser: that route returns whole documents, `content` HTML included, for
 * every published post. Shipping the entire blog to a reader so the page can
 * pick three titles out of it would cost more than the article they came for.
 * This returns four short fields per match.
 *
 * Relatedness is shared tags and nothing cleverer. The alternative on offer was
 * "latest three", which is not relatedness — it is a sidebar that shows the
 * same links on every post and goes stale the moment the newest post is the one
 * being read. When nothing shares a tag this returns an empty array and the
 * block does not render, which is the honest outcome: a post about restaurant
 * pricing has no business recommending one about HVAC scheduling just to fill
 * the space.
 */

import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'
import { log } from '~/server/utils/logger'

interface FirestoreDoc { name: string, fields: Record<string, unknown> }

export interface RelatedPost {
  title: string
  slug: string
  excerpt: string
  publishedAt: string
}

const MAX_RESULTS = 3

function timeOf(v: unknown): number {
  const t = new Date(String(v ?? '')).getTime()
  return Number.isFinite(t) ? t : 0
}

/** Tags compared case- and whitespace-insensitively; they are authored by hand and by a model. */
function normalizeTags(v: unknown): Set<string> {
  if (!Array.isArray(v)) return new Set()
  return new Set(v.map(t => String(t).trim().toLowerCase()).filter(Boolean))
}

export default defineEventHandler(async (event): Promise<RelatedPost[]> => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) return []

  try {
    const res = await firestoreRequest('GET', 'blog_posts')
    const docs: FirestoreDoc[] = res.documents || []

    const posts = docs.map(doc => fromFirestoreFields(doc.fields) as Record<string, unknown>)

    const current = posts.find(p => String(p.slug ?? '') === slug)
    if (!current) return []

    const currentTags = normalizeTags(current.tags)
    if (!currentTags.size) return []

    return posts
      .filter(p => p.status === 'published' && String(p.slug ?? '') !== slug)
      .map((p) => {
        let shared = 0
        for (const tag of normalizeTags(p.tags)) if (currentTags.has(tag)) shared += 1
        return { post: p, shared }
      })
      .filter(x => x.shared > 0)
      // Best overlap first; newest breaks a tie, so the pair of posts that
      // always share two tags do not pin each other to the top forever.
      .sort((a, b) => b.shared - a.shared || timeOf(b.post.publishedAt) - timeOf(a.post.publishedAt))
      .slice(0, MAX_RESULTS)
      .map(({ post }) => ({
        title: String(post.title ?? '').trim(),
        slug: String(post.slug ?? '').trim(),
        excerpt: String(post.excerpt ?? '').trim(),
        publishedAt: String(post.publishedAt ?? ''),
      }))
      .filter(p => p.title && p.slug)
  }
  catch (err) {
    // Not worth failing an article over. Logged rather than swallowed, because
    // "no related posts" and "Firestore is down" look identical on the page and
    // only one of them is normal.
    await log('warn', 'blog', 'Related posts lookup failed', {
      slug,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
})
