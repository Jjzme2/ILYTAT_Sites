/**
 * Structured application logger.
 *
 * Every call:
 *   1. Writes to stdout/stderr (visible in Vercel function logs)
 *   2. Persists an entry to the `logs` Firestore collection (fire-and-forget)
 *
 * The `logs` collection is the source-of-truth for the nightly report.
 * Entries are never blocked by a write failure — console output always happens first.
 *
 * Two things this deliberately does that a naive logger does not:
 *
 *   Deduplication. A failing dependency does not fail once, it fails on every
 *   request until someone fixes it. Writing one Firestore document per
 *   occurrence turns an outage into a bill and buries the other 40 log lines in
 *   the nightly digest under 4,000 copies of the same message. Repeats inside
 *   the dedup window are counted in memory and folded into a single entry.
 *
 *   Escalation. A `critical` used to be indistinguishable from an `info` until
 *   the 2 AM digest arrived — up to 24 hours later. Criticals now email
 *   immediately, throttled so the alert itself cannot become the flood.
 */

import { firestoreRequest, toFirestoreFields } from './firebaseAdmin'
import { notifyAdmin } from './notify'

export type LogLevel = 'info' | 'warn' | 'error' | 'critical'
export type LogArea
  = | 'email' | 'firestore' | 'r2' | 'contact' | 'api' | 'auth' | 'cron' | 'spam'
    | 'ai' | 'analytics' | 'client' | 'tools' | 'blog' | 'security'

/** Lower number = higher priority in the nightly report */
const PRIORITY: Record<LogLevel, number> = { critical: 0, error: 1, warn: 2, info: 3 }

/**
 * Request-scoped fields. Set once by the error-capture plugin and passed
 * through so a log line can be traced back to the request that produced it —
 * previously the only correlation available was the timestamp.
 */
export interface LogContext {
  requestId?: string
  path?: string
  method?: string
  ip?: string
  status?: number
  durationMs?: number
}

/** How long identical entries collapse into one. */
const DEDUP_WINDOW_MS = 5 * 60 * 1000
/** How long between emails for the same critical message. */
const ALERT_WINDOW_MS = 30 * 60 * 1000

interface Seen { firstAt: number, count: number }

const recent = new Map<string, Seen>()
const alerted = new Map<string, number>()

function prune(map: Map<string, { firstAt: number } | number>, windowMs: number, now: number): void {
  if (map.size < 500) return
  for (const [k, v] of map) {
    const at = typeof v === 'number' ? v : v.firstAt
    if (now - at > windowMs) map.delete(k)
  }
}

/**
 * Returns how many suppressed repeats to fold into this entry, or null when
 * the entry should be dropped because an identical one was written recently.
 *
 * The count carried forward is the number suppressed since the *last write*,
 * so nothing is silently lost — a burst of 400 identical errors becomes one
 * document per window that says how many it stands for.
 */
function dedup(key: string, now: number): number | null {
  const seen = recent.get(key)
  if (!seen || now - seen.firstAt > DEDUP_WINDOW_MS) {
    const carried = seen ? seen.count : 0
    recent.set(key, { firstAt: now, count: 0 })
    prune(recent, DEDUP_WINDOW_MS, now)
    return carried
  }
  seen.count += 1
  return null
}

export async function log(
  level: LogLevel,
  area: LogArea,
  message: string,
  data?: Record<string, unknown>,
  context?: LogContext,
): Promise<void> {
  const ts = new Date().toISOString()
  const now = Date.now()
  const prefix = `[${level.toUpperCase()}][${area}]`
  const ctx = context?.requestId ? `[req:${context.requestId}]` : ''
  const extra = data ? JSON.stringify(data) : ''

  // Console output is never suppressed — Vercel's log stream is the place you
  // actually want the full repeat count during an incident.
  if (level === 'info') console.log(prefix, ctx, message, extra)
  else if (level === 'warn') console.warn(prefix, ctx, message, extra)
  else console.error(prefix, ctx, message, extra)

  const key = `${level}:${area}:${message}`
  const repeats = dedup(key, now)
  if (repeats === null) return

  firestoreRequest('POST', 'logs', {
    fields: toFirestoreFields({
      level,
      area,
      message,
      data: data ? JSON.stringify(data).slice(0, 4000) : null,
      priority: PRIORITY[level],
      repeats,
      requestId: context?.requestId ?? null,
      path: context?.path ?? null,
      method: context?.method ?? null,
      status: context?.status ?? null,
      durationMs: context?.durationMs ?? null,
      createdAt: ts,
    }),
  }).catch(err => console.error('[logger] Firestore write failed:', err.message))

  if (level === 'critical') {
    const last = alerted.get(key) ?? 0
    if (now - last > ALERT_WINDOW_MS) {
      alerted.set(key, now)
      prune(alerted, ALERT_WINDOW_MS, now)
      void notifyAdmin({
        level: 'error',
        subject: `Critical: ${message.slice(0, 80)}`,
        title: 'Something on the site needs attention now',
        lines: [
          message,
          context?.path ? `Where: ${context.method ?? 'GET'} ${context.path}` : 'No request path recorded.',
          'Further copies of this same alert are held back for 30 minutes so a loop cannot fill your inbox.',
        ],
        detail: data ? JSON.stringify(data, null, 2).slice(0, 2000) : undefined,
        action: { label: 'Open admin logs', url: 'https://sites.ilytat.com/admin' },
      })
    }
  }
}

/** Convenience wrapper that pulls the message and stack out of an unknown throw. */
export function logError(
  area: LogArea,
  message: string,
  err: unknown,
  context?: LogContext,
): Promise<void> {
  const detail = err instanceof Error
    ? { error: err.message, stack: err.stack?.split('\n').slice(0, 6).join('\n') }
    : { error: String(err) }
  return log('error', area, message, detail, context)
}
