/**
 * Addresses the admin has signed in from before.
 *
 * ── The problem this solves ───────────────────────────────────────────────
 *
 * "Admin signed in" was emailed once per email+IP per day. Two things were
 * wrong with that.
 *
 * It alerts on the wrong event. JJ signs in constantly, and a phone's address
 * changes on its own — new cell, Wi-Fi to data, a DHCP lease renewing. So the
 * notice arrives regularly and says nothing, and an alert that is usually
 * nothing is an alert nobody reads. The one that matters, a sign-in from an
 * address that has never been used, looked exactly like the others.
 *
 * And the throttle did not work. It lived in a Map in module scope, and these
 * run in serverless functions that are created and destroyed constantly — a
 * cold start begins with an empty Map, so "once per day" was really "once per
 * day per instance", and the same sign-in could notify repeatedly.
 *
 * ── What replaces it ──────────────────────────────────────────────────────
 *
 * One small document per (account, address), in Firestore, so the record
 * survives a cold start. A sign-in from an address already in it is recorded
 * and nothing is sent. A sign-in from one that is not gets a prominent alert,
 * because that is the event actually worth reading: somebody signing in from
 * somewhere new.
 *
 * The document id is a hash of account and address rather than the address
 * itself. Firestore ids appear in URLs and error messages; an opaque id keeps
 * the owner's home address out of them. The address is kept in the document,
 * where the security log needs it.
 *
 * ── Cost ──────────────────────────────────────────────────────────────────
 *
 * This runs inside requireAdmin, so a naive version adds a read to every
 * single admin API call. The in-process cache below means a given device
 * costs one read per cold start and nothing after, and it is only ever used
 * to skip work that would confirm what it already says — a stale cache can
 * suppress an alert for an address already known, never invent one.
 *
 * ⚠️ Every device in use when this shipped is unknown to the register, so the
 * first sign-in from each produces one "new address" notice. One per device,
 * once. The alert text says so, because an unexplained new-device warning is
 * exactly the kind of false alarm that teaches someone to ignore the real one.
 */

import { createHash } from 'node:crypto'
import { firestoreRequest, toFirestoreFields, fromFirestoreFields } from './firebaseAdmin'

const COLLECTION = 'admin_known_addresses'

/** Addresses this instance has already confirmed. Never used to add one. */
const seen = new Set<string>()

export interface KnownAddress {
  isNew: boolean
  firstSeenAt: string
  signInCount: number
  /** False when the lookup failed, so callers can avoid crying wolf. */
  reliable: boolean
}

function idFor(email: string, ip: string): string {
  return createHash('sha256').update(`${email.toLowerCase()}|${ip}`).digest('hex').slice(0, 40)
}

/**
 * Record a sign-in and say whether this address had been used before.
 *
 * On any Firestore failure this reports `reliable: false` and `isNew: false`.
 * That combination is deliberate: an alert fired because a *lookup* broke
 * would be indistinguishable from a real intrusion, and the first time it
 * happened it would be treated as one. A missed notice is recoverable — the
 * event is still in the security log either way. A false one is not: it spends
 * the credibility the real alert depends on.
 */
export async function recordAddress(
  email: string,
  ip: string,
  ua: string,
): Promise<KnownAddress> {
  const key = idFor(email, ip)
  const now = new Date().toISOString()

  if (seen.has(key)) {
    return { isNew: false, firstSeenAt: '', signInCount: 0, reliable: true }
  }

  try {
    let existing: { fields?: Record<string, unknown> } | null = null
    try {
      existing = await firestoreRequest('GET', `${COLLECTION}/${key}`)
    }
    catch {
      // A 404 is the answer "never seen", not a failure. Any other error falls
      // through to the same branch, which is why the write below is what
      // decides: if the document really did exist, the create fails and we
      // learn it was not new after all.
      existing = null
    }

    if (existing?.fields) {
      const f = fromFirestoreFields(existing.fields) as { firstSeenAt?: string, signInCount?: number }
      seen.add(key)
      void firestoreRequest('PATCH', `${COLLECTION}/${key}?updateMask.fieldPaths=lastSeenAt&updateMask.fieldPaths=signInCount`, {
        fields: toFirestoreFields({
          lastSeenAt: now,
          signInCount: Number(f.signInCount ?? 0) + 1,
        }),
      }).catch(() => { /* the count is a convenience, not the record */ })

      return {
        isNew: false,
        firstSeenAt: String(f.firstSeenAt ?? ''),
        signInCount: Number(f.signInCount ?? 0) + 1,
        reliable: true,
      }
    }

    // `documentId` makes this create-only: Firestore rejects it if the id is
    // already taken. So two requests racing from a genuinely new address
    // cannot both be told they are the first — one create wins, the other
    // throws and is reported as not-new rather than as a second intrusion.
    await firestoreRequest('POST', `${COLLECTION}?documentId=${key}`, {
      fields: toFirestoreFields({
        email, ip, ua: ua.slice(0, 200),
        firstSeenAt: now, lastSeenAt: now, signInCount: 1,
      }),
    })
    seen.add(key)
    return { isNew: true, firstSeenAt: now, signInCount: 1, reliable: true }
  }
  catch {
    seen.add(key)
    return { isNew: false, firstSeenAt: '', signInCount: 0, reliable: false }
  }
}
