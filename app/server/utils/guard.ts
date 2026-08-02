/**
 * Abuse guards for public endpoints.
 *
 * A public endpoint that calls a paid model is a free API for whoever finds
 * it. These are the three limits that matter, in order of what they stop:
 *
 *   verifyTurnstile — stops scripted abuse outright
 *   rateLimit       — bounds a single determined human
 *   dailyBudget     — bounds total spend if the first two are bypassed
 *
 * State is per-instance and in-memory. On serverless that means limits are
 * per-warm-instance rather than global, which is weaker than a shared store but
 * still removes the trivial attack. The daily cap is the backstop that keeps a
 * worst case bounded rather than open-ended.
 */

interface Bucket { hits: number[] }

const buckets = new Map<string, Bucket>()
const daily = { day: '', count: 0 }

export function clientIp(event: Parameters<typeof getRequestHeader>[0]): string {
  return (
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || 'unknown'
  )
}

/**
 * Sliding-window limit. Throws 429 when exceeded.
 * `scope` keeps separate endpoints from sharing a budget.
 */
export function rateLimit(opts: {
  scope: string
  ip: string
  max: number
  windowMs: number
  message?: string
}): void {
  const key = `${opts.scope}:${opts.ip}`
  const now = Date.now()
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter(t => now - t < opts.windowMs)
  bucket.hits.push(now)
  buckets.set(key, bucket)

  // Prune cold entries so a long-lived instance cannot grow unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.hits.some(t => now - t < opts.windowMs)) buckets.delete(k)
    }
  }

  if (bucket.hits.length > opts.max) {
    throw createError({
      statusCode: 429,
      statusMessage: opts.message ?? 'Too many requests. Give it a few minutes and try again.',
    })
  }
}

/**
 * Global cap across all callers, reset daily. The last line of defence on
 * spend — without it, a bypassed rate limit is an unbounded bill.
 */
export function dailyBudget(cap: number): void {
  const today = new Date().toISOString().slice(0, 10)
  if (daily.day !== today) {
    daily.day = today
    daily.count = 0
  }
  daily.count += 1
  if (daily.count > cap) {
    throw createError({
      statusCode: 503,
      statusMessage: 'This free tool has hit its daily limit. Try again tomorrow, or get in touch and I will just do it for you.',
    })
  }
}

/**
 * Verifies a Cloudflare Turnstile token. Throws 400 on failure.
 *
 * nuxt-turnstile ships a server helper, but calling the API directly keeps the
 * failure mode explicit and lets us return a message a visitor can act on.
 */
export async function verifyTurnstile(
  event: Parameters<typeof getRequestHeader>[0],
  token: string | undefined,
  secret: string,
  ip: string,
): Promise<void> {
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Please complete the verification check.' })
  }
  try {
    const res = await $fetch<{ success: boolean, 'error-codes'?: string[] }>(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: { secret, response: token, remoteip: ip === 'unknown' ? undefined : ip },
      },
    )
    if (!res.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Verification failed. Reload the page and try again.',
      })
    }
  }
  catch (e) {
    if ((e as { statusCode?: number }).statusCode) throw e
    throw createError({ statusCode: 502, statusMessage: 'Could not reach the verification service.' })
  }
}
