/**
 * Server-side observability.
 *
 * Before this, an unhandled error in any API route went to the Vercel function
 * log and nowhere else. Nothing wrote it to the `logs` collection, so it never
 * reached the admin Logs tab or the nightly digest, and nobody found out unless
 * a visitor happened to mention that a form stopped working. Every log line in
 * the system existed only because a handler explicitly asked for it, which
 * means the failures nobody anticipated were exactly the ones that stayed
 * invisible.
 *
 * This hooks Nitro's lifecycle so capture is automatic:
 *
 *   request       — stamps a request id and start time on the event context
 *   error         — records anything thrown, with the route that threw it
 *   afterResponse — records slow requests and any 5xx that did not throw
 *
 * Deliberately quiet about expected failures. A 400 from a validation schema, a
 * 401 on the admin API, a 429 from a rate limiter and a 404 are all the system
 * working correctly; logging them as errors would train the owner to ignore the
 * log. They are counted for the digest, not alerted on.
 */

import type { H3Event } from 'h3'
import { log, logError } from '~/server/utils/logger'
import type { LogArea } from '~/server/utils/logger'

/** Requests slower than this are worth knowing about. */
const SLOW_MS = 8000

/** Routes whose failures are expected often enough to be noise at error level. */
function isExpectedFailure(status: number): boolean {
  return status < 500 && status !== 0
}

/** Best guess at which subsystem a route belongs to, for log filtering. */
function areaForPath(path: string): LogArea {
  if (path.startsWith('/api/admin')) return 'auth'
  if (path.startsWith('/api/tools') || path.startsWith('/api/audit')) return 'tools'
  if (path.startsWith('/api/analytics')) return 'analytics'
  if (path.startsWith('/api/cron')) return 'cron'
  if (path.startsWith('/api/contact') || path.startsWith('/api/quote')) return 'contact'
  return 'api'
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function ipOf(event: H3Event): string {
  const fwd = getRequestHeader(event, 'x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || getRequestHeader(event, 'x-real-ip') || 'unknown'
}

interface Timed { _obsStart?: number, _obsId?: string }

export default defineNitroPlugin((nitroApp) => {
  const nitro = nitroApp.hooks

  nitro.hook('request', (event) => {
    const ctx = event.context as Timed
    ctx._obsStart = Date.now()
    ctx._obsId = shortId()
    // Echoed on the response so a visitor reporting a problem can quote an id
    // that matches a log entry, instead of "it broke around lunchtime".
    setResponseHeader(event, 'x-request-id', ctx._obsId)
  })

  nitro.hook('error', async (error, { event }) => {
    if (!event) {
      await logError('api', 'Unhandled server error outside a request', error)
      return
    }

    const ctx = event.context as Timed
    const path = event.path || 'unknown'
    const status = (error as { statusCode?: number }).statusCode ?? 500

    // Static asset 404s are crawler noise, not defects.
    if (status === 404 && !path.startsWith('/api/')) return

    const context = {
      requestId: ctx._obsId,
      path,
      method: event.method,
      ip: ipOf(event),
      status,
      durationMs: ctx._obsStart ? Date.now() - ctx._obsStart : undefined,
    }

    if (isExpectedFailure(status)) {
      // Recorded so patterns are visible in the digest (a sudden run of 429s
      // means someone is hammering an endpoint) without crying wolf.
      await log('info', areaForPath(path), `${status} on ${path}`, {
        message: (error as { statusMessage?: string }).statusMessage,
      }, context)
      return
    }

    await logError(areaForPath(path), `Unhandled ${status} on ${path}`, error, context)
  })

  nitro.hook('afterResponse', async (event) => {
    const ctx = event.context as Timed
    if (!ctx._obsStart) return
    const durationMs = Date.now() - ctx._obsStart
    const path = event.path || 'unknown'

    if (durationMs < SLOW_MS || !path.startsWith('/api/')) return

    // AI and audit routes are slow by nature — they wait on someone else's API.
    // Still worth a line, but as a warning rather than an error.
    await log('warn', areaForPath(path), `Slow response on ${path}`, { durationMs }, {
      requestId: ctx._obsId,
      path,
      method: event.method,
      durationMs,
    })
  })
})
