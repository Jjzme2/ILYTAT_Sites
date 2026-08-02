/**
 * POST /api/audit
 *
 * Runs a Google PageSpeed Insights (Lighthouse) audit for a public URL and
 * returns the four category scores plus the headline field metrics.
 *
 * Why server-side: PSI takes 10-30s and, with a key, that key must never reach
 * the browser. Doing it here also lets us cache and rate-limit.
 *
 * PAGESPEED_API_KEY is optional — PSI serves anonymous requests at a lower
 * quota, so the tool works without one and simply gets more headroom with it.
 *
 * Body: { url: string, strategy?: 'mobile' | 'desktop' }
 */

interface Lighthouse {
  categories: Record<string, { score: number | null }>
  audits: Record<string, { numericValue?: number, displayValue?: string, title?: string, score?: number | null }>
}

const PSI_DEFAULT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

// Audits worth surfacing as "here is what to fix", in priority order.
const OPPORTUNITIES = [
  'render-blocking-resources',
  'unminified-javascript',
  'unused-javascript',
  'modern-image-formats',
  'uses-optimized-images',
  'uses-responsive-images',
  'server-response-time',
  'uses-text-compression',
]

/** url -> { at, payload }. Per-instance; good enough to blunt refresh spam. */
const cache = new Map<string, { at: number, payload: unknown }>()
const CACHE_MS = 1000 * 60 * 30

/** ip -> timestamps of recent requests. */
const hits = new Map<string, number[]>()
const WINDOW_MS = 1000 * 60 * 10
const MAX_PER_WINDOW = 6

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k)
    }
  }
  return recent.length > MAX_PER_WINDOW
}

/**
 * Only allow public http(s) URLs. Without this the endpoint is an SSRF probe:
 * anyone could point it at localhost or a cloud metadata address and read the
 * result back through the score payload.
 */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: "That doesn't look like a valid web address." })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: 'Only http and https addresses can be audited.' })
  }

  const host = parsed.hostname.toLowerCase()
  const isPrivate
    = host === '::1'
      || host.endsWith('.localhost')
      || host.endsWith('.internal')
      || host.endsWith('.local')
      || /^(127|10)\./.test(host)
      || /^169\.254\./.test(host)     // link-local, incl. cloud metadata
      || /^192\.168\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
      || !host.includes('.')          // single-label hosts, e.g. "localhost"

  if (isPrivate) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a public website address.' })
  }

  return parsed.toString()
}

export default defineEventHandler(async (event) => {
  const ip
    = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
      || getRequestHeader(event, 'x-real-ip')
      || 'unknown'

  if (rateLimited(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'That is a lot of audits. Give it a few minutes and try again.',
    })
  }

  const body = await readBody<{ url?: string, strategy?: string }>(event)
  if (!body?.url) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a website address to audit.' })
  }

  const url = normalizeUrl(body.url)
  const strategy = body.strategy === 'desktop' ? 'desktop' : 'mobile'
  const cacheKey = `${strategy}:${url}`

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.payload
  }

  const config = useRuntimeConfig(event)
  const key = config.pagespeedApiKey
  // Overridable so the success path can be exercised against a local stub;
  // defaults to the real PageSpeed endpoint.
  const endpoint = config.pagespeedApiBase || PSI_DEFAULT

  const params = new URLSearchParams({ url, strategy })
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) {
    params.append('category', c)
  }
  if (key) params.set('key', key)

  let data: { lighthouseResult?: Lighthouse, error?: { message?: string } }
  try {
    data = await $fetch(`${endpoint}?${params.toString()}`, { timeout: 60000 })
  }
  catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 400 || status === 404) {
      throw createError({
        statusCode: 422,
        statusMessage: "Google couldn't load that page. Check the address is public and try again.",
      })
    }
    if (status === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Google is rate-limiting audits right now. Try again shortly.',
      })
    }
    throw createError({ statusCode: 502, statusMessage: 'The audit service is unavailable right now.' })
  }

  const lh = data.lighthouseResult
  if (!lh) {
    throw createError({ statusCode: 502, statusMessage: 'The audit returned no result. Try again.' })
  }

  const pct = (v: number | null | undefined) =>
    typeof v === 'number' ? Math.round(v * 100) : null

  const payload = {
    url,
    strategy,
    scores: {
      performance: pct(lh.categories.performance?.score),
      accessibility: pct(lh.categories.accessibility?.score),
      bestPractices: pct(lh.categories['best-practices']?.score),
      seo: pct(lh.categories.seo?.score),
    },
    metrics: {
      lcp: lh.audits['largest-contentful-paint']?.displayValue ?? null,
      cls: lh.audits['cumulative-layout-shift']?.displayValue ?? null,
      tbt: lh.audits['total-blocking-time']?.displayValue ?? null,
      fcp: lh.audits['first-contentful-paint']?.displayValue ?? null,
    },
    // Only surface audits the page actually failed, so the list is a to-do
    // rather than a wall of green ticks.
    opportunities: OPPORTUNITIES
      .map(id => ({ id, audit: lh.audits[id] }))
      .filter(({ audit }) => audit && typeof audit.score === 'number' && audit.score < 0.9)
      .map(({ audit }) => ({
        title: audit!.title ?? '',
        detail: audit!.displayValue ?? '',
      }))
      .slice(0, 6),
    generatedAt: new Date().toISOString(),
  }

  cache.set(cacheKey, { at: Date.now(), payload })
  return payload
})
