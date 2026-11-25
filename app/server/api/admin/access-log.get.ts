/**
 * GET /api/admin/access-log
 *
 * Who has reached the admin area, and from where.
 *
 * Every admin request has been written to `admin_access` for months —
 * outcome, address, path, device, request id, timestamp — and nothing has
 * ever read it. The alert emails even carry a button labelled "Open admin
 * security log" pointing at /admin, where the Security tab holds the 2FA
 * setup and no log. So the one question those alerts provoke, "have I seen
 * this address before?", could only be answered in the Firebase console.
 *
 * ── Addresses are the point ───────────────────────────────────────────────
 *
 * A list of events does not answer that question; you would be reading
 * timestamps trying to remember where you were. The `addresses` summary does:
 * each address with its first and last sighting and what it has done. An
 * address first seen months ago, with a long history of successful sign-ins,
 * is yours. One first seen an hour ago is not.
 *
 * ── On being honest about partial data ────────────────────────────────────
 *
 * "First seen" is only true if the whole history was read. Firestore pages
 * list results, so a single request returns a slice — and a slice would give
 * a first-seen date that is simply the oldest record that happened to be
 * fetched. That is worse than no date, because it looks like an answer, and
 * the wrong answer here is "this address is new" about the owner's own phone.
 *
 * So this pages to the end, and if it hits the cap it says so in `truncated`
 * and the UI says the dates are a lower bound. Nothing presents a partial
 * scan as a complete one.
 *
 * Note also that Firestore's list returns documents in document-id order, not
 * chronological order, which is why everything is sorted here afterwards.
 */

import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

/** Events returned to the client. Enough to scan, not enough to be a dump. */
const EVENT_LIMIT = 250
/** Records per Firestore page. */
const PAGE_SIZE = 300
/** Pages before giving up and admitting the scan is partial. */
const MAX_PAGES = 12

export interface AccessEvent {
  id: string
  outcome: string
  email: string
  ip: string
  path: string
  ua: string
  reason: string | null
  requestId: string
  createdAt: string
}

export interface AddressSummary {
  ip: string
  firstSeenAt: string
  lastSeenAt: string
  total: number
  /** Count per outcome, so a address with failures stands out. */
  outcomes: Record<string, number>
  /** Most recent device string seen from this address. */
  ua: string
  accounts: string[]
}

function timeOf(v: string): number {
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const all: AccessEvent[] = []
  let pageToken = ''
  let truncated = false

  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = `admin_access?pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
    const res = await firestoreRequest('GET', qs) as {
      documents?: Array<{ name: string, fields?: Record<string, unknown> }>
      nextPageToken?: string
    }

    for (const doc of res.documents ?? []) {
      const f = fromFirestoreFields(doc.fields ?? {}) as Record<string, unknown>
      all.push({
        id: doc.name.split('/').pop() as string,
        outcome: String(f.outcome ?? 'unknown'),
        email: String(f.email ?? ''),
        ip: String(f.ip ?? 'unknown'),
        path: String(f.path ?? ''),
        ua: String(f.ua ?? ''),
        reason: f.reason == null ? null : String(f.reason),
        requestId: String(f.requestId ?? ''),
        createdAt: String(f.createdAt ?? ''),
      })
    }

    pageToken = res.nextPageToken ?? ''
    if (!pageToken) break
    if (page === MAX_PAGES - 1) truncated = true
  }

  const byIp = new Map<string, AddressSummary>()
  for (const e of all) {
    const existing = byIp.get(e.ip)
    if (!existing) {
      byIp.set(e.ip, {
        ip: e.ip,
        firstSeenAt: e.createdAt,
        lastSeenAt: e.createdAt,
        total: 1,
        outcomes: { [e.outcome]: 1 },
        ua: e.ua,
        accounts: e.email ? [e.email] : [],
      })
      continue
    }
    existing.total += 1
    existing.outcomes[e.outcome] = (existing.outcomes[e.outcome] ?? 0) + 1
    if (timeOf(e.createdAt) < timeOf(existing.firstSeenAt)) existing.firstSeenAt = e.createdAt
    if (timeOf(e.createdAt) > timeOf(existing.lastSeenAt)) {
      existing.lastSeenAt = e.createdAt
      if (e.ua) existing.ua = e.ua
    }
    if (e.email && !existing.accounts.includes(e.email)) existing.accounts.push(e.email)
  }

  const events = all
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))
    .slice(0, EVENT_LIMIT)

  return {
    events,
    addresses: [...byIp.values()].sort((a, b) => timeOf(b.lastSeenAt) - timeOf(a.lastSeenAt)),
    scanned: all.length,
    // True when the history is longer than this scan reached, which makes
    // every firstSeenAt a lower bound rather than a fact. The UI must say so.
    truncated,
  }
})
