/**
 * What the blog has already covered.
 *
 * Both the weekly generation and the reroll button need this, and only reroll
 * had it — so the scheduled post, which is the one that actually runs every
 * week, proposed next week's topic with no idea what was already published.
 * Left alone it drifts back over the same ground: three variations on Google
 * Business Profile in a month reads like a site with nothing new to say.
 *
 * Note this returns *recent* posts, ordered. The previous implementation in
 * reroll-plan listed the collection and took `.slice(-15)`, but Firestore's
 * REST list returns documents in document-id order, not chronological order —
 * so that was fifteen arbitrary posts, and a genuinely recent topic could sit
 * outside the window while a two-year-old one was inside it.
 */

import { firestoreRequest, fromFirestoreFields } from './firebaseAdmin'

export interface PastPost {
  title: string
  tags: string[]
  createdAt: string
}

function timeOf(v: unknown): number {
  if (v instanceof Date) return v.getTime()
  const t = new Date(String(v ?? '')).getTime()
  return Number.isFinite(t) ? t : 0
}

/**
 * Most recent posts first, drafts included — a draft is still a topic that has
 * been written about, so proposing it again wastes a week.
 */
export async function recentPosts(limit = 20): Promise<PastPost[]> {
  try {
    const res = await firestoreRequest('GET', 'blog_posts')
    const docs = (res.documents ?? []) as { fields: Record<string, unknown> }[]
    return docs
      .map((d) => {
        const f = fromFirestoreFields(d.fields) as {
          title?: string
          tags?: unknown
          createdAt?: unknown
          publishedAt?: unknown
        }
        return {
          title: String(f.title ?? '').trim(),
          tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
          createdAt: String(f.createdAt ?? f.publishedAt ?? ''),
          _t: Math.max(timeOf(f.createdAt), timeOf(f.publishedAt)),
        }
      })
      .filter(p => p.title)
      .sort((a, b) => b._t - a._t)
      .slice(0, limit)
      .map(({ title, tags, createdAt }) => ({ title, tags, createdAt }))
  }
  catch {
    // Best-effort. Not knowing the history is a worse post, not a failed one —
    // never block generation on it.
    return []
  }
}

/** Just the titles, newest first. */
export async function recentTitles(limit = 20): Promise<string[]> {
  return (await recentPosts(limit)).map(p => p.title)
}

/**
 * Titles and themes from a single read.
 *
 * Calling recentTitles() and recentThemes() together fetched the whole
 * blog_posts collection twice, in parallel, for the same data. Harmless in
 * isolation, but this runs immediately before blog generation inside a
 * serverless function with a hard sixty-second ceiling — every second spent
 * here is a second the model does not get, and the weekly job was already
 * timing out.
 */
export async function recentContext(limit = 20, themeLimit = 8): Promise<{
  titles: string[]
  themes: string[]
}> {
  const posts = await recentPosts(limit)
  const seen = new Set<string>()
  for (const p of posts.slice(0, themeLimit)) {
    for (const t of p.tags) {
      const k = t.trim().toLowerCase()
      if (k) seen.add(k)
    }
  }
  return { titles: posts.map(p => p.title), themes: [...seen] }
}
