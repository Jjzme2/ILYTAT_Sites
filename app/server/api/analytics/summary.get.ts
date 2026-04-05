/**
 * GET /api/analytics/summary
 *
 * Returns aggregated analytics for the admin dashboard.
 * Reads up to 500 most-recent events from Firestore and computes:
 *   - counts per event type (all-time and last 30 days)
 *   - simple checkout funnel (initiated → success)
 *   - contact submission count
 *   - recent events feed (last 60)
 */

import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'
import { requireAdmin } from '~/server/utils/verifyAdmin'

interface RawEvent {
  id: string
  event: string
  props: string       // JSON-stringified properties object
  sessionId: string
  referrer: string
  ua: string
  createdAt: string
}

interface ParsedEvent extends Omit<RawEvent, 'props'> {
  properties: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    // Firestore REST list — pageSize 300 (API max), newest first via orderBy
    const res = await firestoreRequest('GET', 'analytics_events?pageSize=300&orderBy=createdAt%20desc')
    const docs: Array<{ name: string; fields: Record<string, unknown> }> = res.documents || []

    const events: ParsedEvent[] = docs.map((doc) => {
      const raw = fromFirestoreFields(doc.fields) as RawEvent
      let properties: Record<string, unknown> = {}
      try { properties = JSON.parse(raw.props || '{}') }
      catch { /* malformed props, skip */ }
      return {
        id:        doc.name.split('/').pop() as string,
        event:     raw.event || '',
        properties,
        sessionId: raw.sessionId || '',
        referrer:  raw.referrer || '',
        ua:        raw.ua || '',
        createdAt: raw.createdAt || '',
      }
    })

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const sevenDaysAgo  = now -  7 * 24 * 60 * 60 * 1000

    // ── Counts ────────────────────────────────────────────────────────────────
    const allCounts:  Record<string, number> = {}
    const day30Counts: Record<string, number> = {}
    const day7Counts:  Record<string, number> = {}

    for (const e of events) {
      allCounts[e.event] = (allCounts[e.event] || 0) + 1
      const ts = new Date(e.createdAt).getTime()
      if (ts >= thirtyDaysAgo) day30Counts[e.event] = (day30Counts[e.event] || 0) + 1
      if (ts >= sevenDaysAgo)  day7Counts[e.event]  = (day7Counts[e.event]  || 0) + 1
    }

    // ── Checkout funnel ───────────────────────────────────────────────────────
    const funnel = {
      pricing_viewed:      day30Counts['pricing_viewed']      || 0,
      checkout_initiated:  day30Counts['checkout_initiated']  || 0,
      checkout_abandoned:  day30Counts['checkout_abandoned']  || 0,
      checkout_success:    day30Counts['checkout_success']    || 0,
    }

    // Conversion rate (initiated → success), avoid div-by-zero
    const conversionRate = funnel.checkout_initiated > 0
      ? Math.round((funnel.checkout_success / funnel.checkout_initiated) * 100)
      : null

    // ── Package breakdown (all-time) ──────────────────────────────────────────
    const packageBreakdown: Record<string, number> = {}
    for (const e of events) {
      if (e.event === 'checkout_initiated' && e.properties.packageName) {
        const pkg = String(e.properties.packageName)
        packageBreakdown[pkg] = (packageBreakdown[pkg] || 0) + 1
      }
    }

    // ── Recent events feed (last 60) ──────────────────────────────────────────
    const recent = events.slice(0, 60).map(e => ({
      id:         e.id,
      event:      e.event,
      properties: e.properties,
      sessionId:  e.sessionId,
      createdAt:  e.createdAt,
    }))

    return {
      total:           events.length,
      allCounts,
      day30Counts,
      day7Counts,
      funnel,
      conversionRate,
      packageBreakdown,
      recent,
    }
  }
  catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : String(err),
      total: 0,
      allCounts: {},
      day30Counts: {},
      day7Counts: {},
      funnel: { pricing_viewed: 0, checkout_initiated: 0, checkout_abandoned: 0, checkout_success: 0 },
      conversionRate: null,
      packageBreakdown: {},
      recent: [],
    }
  }
})
