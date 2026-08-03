/**
 * Retention pruning for the telemetry collections.
 *
 * `logs` and `analytics_events` are append-only and nothing ever deleted from
 * them. Every page view and every log line was kept forever, on a billed
 * database, to serve reports that only ever look back 30 days. Left alone this
 * is a bill that grows on its own and a set of queries that get slower every
 * month while answering exactly the same question.
 *
 * Runs from the nightly cron. Deliberately conservative:
 *
 *   - Deletes strictly by age, oldest first, in a bounded batch. A cap per run
 *     means a bug here cannot empty a collection in one pass, and the backlog
 *     drains over a few nights instead.
 *   - Failures are counted and returned rather than thrown. Pruning is
 *     housekeeping; it must never be the reason the nightly report fails to
 *     send.
 */

import { firestoreRunQuery, firestoreRequest } from './firebaseAdmin'

export interface PruneResult {
  collection: string
  deleted: number
  failed: number
  error?: string
}

/**
 * Deletes documents older than `days` from `collection`.
 * At most `max` documents per call.
 */
export async function pruneCollection(
  collection: string,
  days: number,
  max = 400,
): Promise<PruneResult> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()

  try {
    const stale = await firestoreRunQuery({
      collectionId: collection,
      whereField: 'createdAt',
      whereOp: 'LESS_THAN_OR_EQUAL',
      whereValue: cutoff,
      orderByField: 'createdAt',
      // Oldest first, so repeated runs always chew through the backlog rather
      // than re-reading the same newest-but-still-stale window.
      orderByDir: 'ASCENDING',
      limit: max,
    })

    let deleted = 0
    let failed = 0

    // Sequential rather than parallel: this is a background chore competing
    // with real traffic for the same Firestore quota, and finishing a few
    // seconds sooner is worth nothing.
    for (const doc of stale) {
      try {
        await firestoreRequest('DELETE', `${collection}/${doc.id}`)
        deleted += 1
      }
      catch {
        failed += 1
      }
    }

    return { collection, deleted, failed }
  }
  catch (err) {
    return {
      collection,
      deleted: 0,
      failed: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
