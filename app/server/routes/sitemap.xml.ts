/**
 * GET /sitemap.xml
 *
 * Replaces the hand-maintained public/sitemap.xml, which listed four static
 * URLs and silently omitted every blog post and service page. Generated at
 * request time so new posts and services appear without a redeploy.
 */
import { siteConfig } from '~/config/site.config'

const ORIGIN = 'https://sites.ilytat.com'

interface Entry {
  loc: string
  changefreq: string
  priority: string
  lastmod?: string
}

interface BlogPost {
  slug: string
  updatedAt?: string
  publishedAt?: string
}

export default defineEventHandler(async (event) => {
  const entries: Entry[] = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/services', changefreq: 'monthly', priority: '0.9' },
    { loc: '/tools/website-audit', changefreq: 'monthly', priority: '0.8' },
    { loc: '/blog', changefreq: 'weekly', priority: '0.7' },
    { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
  ]

  for (const svc of siteConfig.services) {
    entries.push({ loc: `/services/${svc.slug}`, changefreq: 'monthly', priority: '0.8' })
  }

  // Blog posts are best-effort: a Firestore outage should degrade the sitemap,
  // not 500 it.
  try {
    const posts = await $fetch<BlogPost[]>('/api/blog', { headers: getRequestHeaders(event) as Record<string, string> })
    for (const post of posts ?? []) {
      if (!post?.slug) continue
      entries.push({
        loc: `/blog/${post.slug}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: (post.updatedAt || post.publishedAt || '').slice(0, 10) || undefined,
      })
    }
  }
  catch {
    // Fall through with the static entries.
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(e => `  <url>
    <loc>${ORIGIN}${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`)
  .join('\n')}
</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
  return body
})
