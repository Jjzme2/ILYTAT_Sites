/**
 * Structured application logger.
 *
 * Every call:
 *   1. Writes to stdout/stderr (visible in Vercel function logs)
 *   2. Persists an entry to the `logs` Firestore collection (fire-and-forget)
 *
 * The `logs` collection is the source-of-truth for the nightly report.
 * Entries are never blocked by a write failure — console output always happens first.
 */

import { firestoreRequest, toFirestoreFields } from './firebaseAdmin'

export type LogLevel = 'info' | 'warn' | 'error' | 'critical'
export type LogArea  = 'stripe' | 'email' | 'firestore' | 'r2' | 'contact' | 'api' | 'auth' | 'cron'

/** Lower number = higher priority in the nightly report */
const PRIORITY: Record<LogLevel, number> = { critical: 0, error: 1, warn: 2, info: 3 }

export async function log(
  level: LogLevel,
  area:  LogArea,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const ts     = new Date().toISOString()
  const prefix = `[${level.toUpperCase()}][${area}]`
  const extra  = data ? JSON.stringify(data) : ''

  if (level === 'info')       console.log(prefix, message, extra)
  else if (level === 'warn')  console.warn(prefix, message, extra)
  else                        console.error(prefix, message, extra)

  firestoreRequest('POST', 'logs', {
    fields: toFirestoreFields({
      level,
      area,
      message,
      data:     data ? JSON.stringify(data) : null,
      priority: PRIORITY[level],
      createdAt: ts,
    }),
  }).catch(err => console.error('[logger] Firestore write failed:', err.message))
}
