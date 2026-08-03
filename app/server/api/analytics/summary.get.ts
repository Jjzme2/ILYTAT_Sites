/**
 * GET /api/analytics/summary
 *
 * Aggregates visitor analytics for the admin dashboard.
 *
 * Rewritten from a REST list call that pulled the 300 most recent documents and
 * counted event names. Two problems with that: 300 documents is a few days of
 * traffic once page views are recorded, so the "last 30 days" figure was
 * silently a "last however-long-300-events-took" figure; and counting names
 * answers no question anyone actually has. Nobody wants to know that
 * `cta_click` happened 40 times — they want to know which page it happened on,
 * where those people came from, whether the number is going up, and how many of
 * them made contact.
 *
 * Now a windowed structured query, returning:
 *   - visits, unique sessions and a conversion rate
 *   - a daily series for the sparkline
 *   - top pages, referrers and device split
 *   - CTA breakdown and full event counts
 *   - recent client-side errors, from the `logs` collection
 */

import { firestoreRunQuery } from '~/server/utils/firebaseAdmin'
import { requireAdmin } from '~/server/utils/verifyAdmin'

interface RawEvent {
  id: string
  event?: string
  props?: string
  path?: string
  sessionId?: string
  referrer?: string
  device?: string
  createdAt?: string
}

interface Evt {
  id: string
  event: string
  properties: Record<string, unknown>
  path: string
  sessionId: string
  referrer: string
  device: string
  createdAt: string
}

/** Days of history to aggregate. Bounded so the query stays cheap and fast. */
const WINDOW_DAYS = 30
const MAX_EVENTS = 5000

function topN(counts: Record<string, number>, n: number): Array<{ key: string, count: number }> {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const now = Date.now()
  const since = new Date(now - WINDOW_DAYS * 86_400_000).toISOString()

  try {
    const [eventsRes, errorsRes] = await Promise.allSettled([
      firestoreRunQuery({
        collectionId: 'analytics_events',
        whereField: 'createdAt',
        whereOp: 'GREATER_THAN_OR_EQUAL',
        whereValue: since,
        orderByField: 'createdAt',
        orderByDir: 'DESCENDING',
        limit: MAX_EVENTS,
      }),
      firestoreRunQuery({
        collectionId: 'logs',
        whereField: 'createdAt',
        whereOp: 'GREATER_THAN_OR_EQUAL',
        whereValue: new Date(now - 7 * 86_400_000).toISOString(),
        orderByField: 'createdAt',
        orderByDir: 'DESCENDING',
        limit: 300,
      }),
    ])

    if (eventsRes.status === 'rejected') throw eventsRes.reason

    const events: Evt[] = (eventsRes.value as RawEvent[]).map((raw) => {
      let properties: Record<string, unknown> = {}
      try { properties = JSON.parse(raw.props || '{}') }
      catch { /* malformed props, skip */ }
      return {
        id: raw.id,
        event: raw.event || '',
        properties,
        path: raw.path || '',
        sessionId: raw.sessionId || '',
        referrer: raw.referrer || '',
        device: raw.device || 'unknown',
        createdAt: raw.createdAt || '',
      }
    })

    const sevenDaysAgo = now - 7 * 86_400_000
    const oneDayAgo = now - 86_400_000

    const day30Counts: Record<string, number> = {}
    const day7Counts: Record<string, number> = {}
    const day1Counts: Record<string, number> = {}
    const pages: Record<string, number> = {}
    const referrers: Record<string, number> = {}
    const devices: Record<string, number> = {}
    const ctaBreakdown: Record<string, number> = {}
    const toolUse: Record<string, number> = {}
    /** ISO date → { views, sessions } for the daily series. */
    const byDay = new Map<string, { views: number, sessions: Set<string> }>()

    const sessions30 = new Set<string>()
    const sessions7 = new Set<string>()
    const convertedSessions = new Set<string>()

    for (const e of events) {
      const ts = new Date(e.createdAt).getTime()
      if (!Number.isFinite(ts)) continue

      day30Counts[e.event] = (day30Counts[e.event] || 0) + 1
      if (ts >= sevenDaysAgo) day7Counts[e.event] = (day7Counts[e.event] || 0) + 1
      if (ts >= oneDayAgo) day1Counts[e.event] = (day1Counts[e.event] || 0) + 1

      if (e.sessionId) {
        sessions30.add(e.sessionId)
        if (ts >= sevenDaysAgo) sessions7.add(e.sessionId)
        if (e.event === 'contact_submit') convertedSessions.add(e.sessionId)
      }

      if (e.event === 'page_view') {
        if (e.path) pages[e.path] = (pages[e.path] || 0) + 1
        // Referrer and device are session attributes; counting them on page
        // views only keeps a chatty session from dominating the split.
        referrers[e.referrer || '(direct)'] = (referrers[e.referrer || '(direct)'] || 0) + 1
        devices[e.device] = (devices[e.device] || 0) + 1

        const day = e.createdAt.slice(0, 10)
        const bucket = byDay.get(day) ?? { views: 0, sessions: new Set<string>() }
        bucket.views += 1
        if (e.sessionId) bucket.sessions.add(e.sessionId)
        byDay.set(day, bucket)
      }

      if (e.event === 'cta_click' && e.properties.label) {
        const label = String(e.properties.label).slice(0, 60)
        ctaBreakdown[label] = (ctaBreakdown[label] || 0) + 1
      }

      if ((e.event === 'tool_use' || e.event === 'audit_run') && e.properties.tool) {
        const tool = String(e.properties.tool).slice(0, 40)
        toolUse[tool] = (toolUse[tool] || 0) + 1
      }
    }

    // Fill every day in the window so the chart shows quiet days as zero rather
    // than closing the gap and implying steady traffic.
    const series: Array<{ date: string, views: number, sessions: number }> = []
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const date = new Date(now - i * 86_400_000).toISOString().slice(0, 10)
      const bucket = byDay.get(date)
      series.push({ date, views: bucket?.views ?? 0, sessions: bucket?.sessions.size ?? 0 })
    }

    const submits30 = day30Counts.contact_submit || 0
    const conversionRate = sessions30.size
      ? Math.round((convertedSessions.size / sessions30.size) * 1000) / 10
      : 0

    // Client-side JS errors, which have no other home in the dashboard.
    interface LogRow { id: string, level?: string, area?: string, message?: string, path?: string, createdAt?: string, repeats?: number }
    const logRows = errorsRes.status === 'fulfilled' ? errorsRes.value as LogRow[] : []
    const clientErrors = logRows
      .filter(l => l.area === 'client')
      .slice(0, 20)
      .map(l => ({
        id: l.id,
        message: l.message || '',
        path: l.path || '',
        repeats: l.repeats || 0,
        createdAt: l.createdAt || '',
      }))
    const errorCount7d = logRows.filter(l => l.level === 'error' || l.level === 'critical').length

    return {
      windowDays: WINDOW_DAYS,
      total: events.length,
      truncated: events.length >= MAX_EVENTS,
      pageViews30: day30Counts.page_view || 0,
      pageViews7: day7Counts.page_view || 0,
      pageViews1: day1Counts.page_view || 0,
      sessions30: sessions30.size,
      sessions7: sessions7.size,
      submits30,
      conversionRate,
      errorCount7d,
      day30Counts,
      day7Counts,
      day1Counts,
      series,
      topPages: topN(pages, 12),
      topReferrers: topN(referrers, 8),
      devices,
      ctaBreakdown,
      toolUse,
      clientErrors,
      recent: events.slice(0, 60).map(e => ({
        id: e.id,
        event: e.event,
        properties: e.properties,
        path: e.path,
        sessionId: e.sessionId,
        createdAt: e.createdAt,
      })),
    }
  }
  catch (err: unknown) {
    // Returning a 200 with an error field, not a 500: the admin page renders
    // this banner, and a hard failure here would blank the whole tab.
    return {
      error: err instanceof Error ? err.message : String(err),
      windowDays: WINDOW_DAYS,
      total: 0,
      truncated: false,
      pageViews30: 0,
      pageViews7: 0,
      pageViews1: 0,
      sessions30: 0,
      sessions7: 0,
      submits30: 0,
      conversionRate: 0,
      errorCount7d: 0,
      day30Counts: {},
      day7Counts: {},
      day1Counts: {},
      series: [],
      topPages: [],
      topReferrers: [],
      devices: {},
      ctaBreakdown: {},
      toolUse: {},
      clientErrors: [],
      recent: [],
    }
  }
})
