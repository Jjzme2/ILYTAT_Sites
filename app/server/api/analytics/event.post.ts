/**
 * POST /api/analytics/event
 *
 * Records a single visitor event.
 *
 * This endpoint used to accept anything: any event name up to 80 characters,
 * an unbounded properties object that was JSON-stringified straight into
 * Firestore, no rate limit, and no bot filtering. That is a public write handle
 * on a billed database — a single loop could have created documents until the
 * quota ran out, and every crawler that executed the page was inflating the
 * numbers the pricing decisions were being made from.
 *
 * It now enforces four things:
 *
 *   1. A per-IP rate limit generous enough for a real browsing session.
 *   2. A known event name — unknown names are dropped, not stored, so a typo
 *      in a component cannot quietly create a metric nobody is reading.
 *   3. Hard caps on property count, key length and serialised size.
 *   4. Bot user-agents dropped, so the funnel counts people.
 *
 * It also captures what the old version threw away: the page, the campaign
 * parameters, and a device class. Without those, "42 pricing views" could not
 * be traced to a page, a source, or a screen size.
 */

import { z } from 'zod'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'
import { clientIp, rateLimit } from '~/server/utils/guard'

/**
 * Every event the site is allowed to record.
 *
 * An allowlist rather than a pattern because the value of this collection is
 * that a name means the same thing every time it appears. Add here when you add
 * a `track()` call.
 */
const EVENTS = new Set([
  // Navigation
  'page_view',
  // Funnel
  'pricing_viewed',
  'billing_toggle',
  'cta_click',
  'contact_submit',
  'contact_error',
  'checkout_initiated',
  // Free tools
  'tool_use',
  'audit_run',
  // Preferences
  'theme_changed',
  'lumen_toggled',
])

const MAX_PROPS = 12
const MAX_PROP_LEN = 120

const schema = z.object({
  event: z.string().min(1).max(60),
  properties: z.record(z.unknown()).optional().default({}),
  sessionId: z.string().max(64).optional().default(''),
  path: z.string().max(200).optional().default(''),
  referrer: z.string().max(300).optional().default(''),
})

/** Obvious automated traffic. Not exhaustive — it does not need to be. */
const BOT = /bot|crawler|spider|crawling|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python-requests|axios|scrapy|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|semrush|ahrefs|mj12|dotbot/i

/**
 * Flattens properties to short scalar strings.
 *
 * Anything nested, oversized or beyond the key budget is dropped rather than
 * truncated into something misleading. Property values are visitor-influenced
 * in places (tool inputs, CTA labels), so nothing structured survives the trip.
 */
function sanitizeProps(input: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  let n = 0
  for (const [rawKey, value] of Object.entries(input)) {
    if (n >= MAX_PROPS) break
    const key = rawKey.slice(0, 40).replace(/[^\w.-]/g, '')
    if (!key) continue
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
    else if (typeof value === 'boolean') out[key] = value
    else if (typeof value === 'string') out[key] = value.slice(0, MAX_PROP_LEN)
    else continue
    n += 1
  }
  return out
}

/** Coarse device class from the UA. Enough to answer "is mobile converting?". */
function deviceClass(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobi|android|iphone|ipod/i.test(ua)) return 'mobile'
  return 'desktop'
}

/** Campaign parameters, read off the page URL the client reported. */
function utmFrom(path: string): Record<string, string> {
  const q = path.indexOf('?')
  if (q === -1) return {}
  const params = new URLSearchParams(path.slice(q + 1))
  const out: Record<string, string> = {}
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = params.get(k)
    if (v) out[k] = v.slice(0, 80)
  }
  return out
}

/** Host only. A full referrer URL can carry query strings we have no use for. */
function referrerHost(referrer: string): string {
  if (!referrer) return ''
  try {
    return new URL(referrer).hostname.replace(/^www\./, '').slice(0, 100)
  }
  catch {
    return ''
  }
}

export default defineEventHandler(async (event) => {
  const ua = getHeader(event, 'user-agent') || ''

  // Return 200 for dropped traffic. A bot that learns it was rejected is a bot
  // that tries a different user-agent.
  if (BOT.test(ua)) return { ok: true }

  const ip = clientIp(event)
  // A real session fires a handful of events per page. 120/minute is far above
  // any genuine pattern and far below anything that costs money.
  rateLimit({ scope: 'analytics', ip, max: 120, windowMs: 60_000, message: 'Too many events.' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) return { ok: true }
  const data = parsed.data

  if (!EVENTS.has(data.event)) return { ok: true, dropped: 'unknown_event' }

  const path = (data.path || '').slice(0, 200)
  const props = { ...sanitizeProps(data.properties), ...utmFrom(path) }

  try {
    await firestoreRequest('POST', 'analytics_events', {
      fields: toFirestoreFields({
        event: data.event,
        props: JSON.stringify(props).slice(0, 2000),
        // Path without the query string — campaign params are captured in props
        // and a query string would otherwise split one page into many rows.
        path: path.split('?')[0] || '',
        sessionId: data.sessionId,
        referrer: referrerHost(data.referrer || getHeader(event, 'referer') || ''),
        device: deviceClass(ua),
        ua: ua.slice(0, 200),
        createdAt: new Date().toISOString(),
      }),
    })
  }
  catch { /* analytics must never break the page it is measuring */ }

  return { ok: true }
})
