/**
 * Who tried to reach the admin area, and whether they got in.
 *
 * Every rejection in requireAdmin used to be a bare `throw` — no log, no email,
 * no record. Someone could probe the admin API all week and the only trace
 * would be 401s in a Vercel log nobody reads. For a site where the admin can
 * publish to the public blog and read every inquiry, that is the one place
 * silence is least affordable.
 *
 * ── Notification policy ───────────────────────────────────────────────────
 *
 * The hard part is not recording events, it is not becoming noise. Every admin
 * API call passes through here, and JJ uses the admin constantly, so "email on
 * every success" would be dozens a day and would train him to ignore the alert
 * that matters.
 *
 *   denied   — authenticated with Firebase but not on the admin list. Someone
 *              made an account and is now knocking. Always emailed; this is the
 *              signal worth waking up for.
 *   totp     — right account, wrong or missing second factor. Emailed: either
 *              the session expired, or someone has the password.
 *   invalid  — no or unusable token. Common and mostly benign (an expired tab,
 *              a crawler), so it is recorded and only emailed when it repeats.
 *   granted  — emailed only the first time an account signs in from a given
 *              address; every later sign-in from it is recorded silently. A
 *              phone's address changes on its own, so a per-day notice fired
 *              constantly and taught the reader to skim past it. See
 *              adminDevices.ts.
 *
 * Everything is best-effort and non-blocking: auditing must never be the reason
 * a legitimate admin request fails, nor the reason an illegitimate one succeeds.
 */

import type { H3Event } from 'h3'
import { firestoreRequest, toFirestoreFields } from './firebaseAdmin'
import { notifyAdmin } from './notify'
import { log } from './logger'
import { recordAddress } from './adminDevices'

export type AuthOutcome = 'granted' | 'denied' | 'totp' | 'invalid' | 'login_failed'

/**
 * Alerts triggered by unauthenticated callers, capped per day.
 *
 * `login_failed` is reported by the login page itself, so the endpoint behind it
 * has to be public — the caller has not signed in yet, that is the whole point.
 * A public endpoint that can send email is an inbox-flood vector, and the
 * per-IP throttle below does not help against a flood spread across addresses.
 * This is the backstop: past the cap, attempts are still recorded, just not
 * emailed.
 */
const unauthAlerts = { day: '', count: 0 }
const UNAUTH_ALERT_CAP = 20

function withinUnauthCap(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (unauthAlerts.day !== today) {
    unauthAlerts.day = today
    unauthAlerts.count = 0
  }
  unauthAlerts.count += 1
  return unauthAlerts.count <= UNAUTH_ALERT_CAP
}

/** One alert per key per window, so a loop cannot fill the inbox. */
const alerted = new Map<string, number>()
const DAY_MS = 24 * 60 * 60 * 1000
const REPEAT_WINDOW_MS = 60 * 60 * 1000

/** Counts recent failures per IP so a burst can be alerted on, not each attempt. */
const failures = new Map<string, number[]>()

function shouldAlert(key: string, windowMs: number): boolean {
  const now = Date.now()
  const last = alerted.get(key) ?? 0
  if (now - last < windowMs) return false
  alerted.set(key, now)
  if (alerted.size > 500) {
    for (const [k, at] of alerted) if (now - at > DAY_MS) alerted.delete(k)
  }
  return true
}

function countFailure(ip: string): number {
  const now = Date.now()
  const hits = (failures.get(ip) ?? []).filter(t => now - t < REPEAT_WINDOW_MS)
  hits.push(now)
  failures.set(ip, hits)
  if (failures.size > 1000) {
    for (const [k, v] of failures) {
      if (!v.some(t => now - t < REPEAT_WINDOW_MS)) failures.delete(k)
    }
  }
  return hits.length
}

function ipOf(event: H3Event): string {
  return (
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || 'unknown'
  )
}

const LABEL: Record<AuthOutcome, string> = {
  granted: 'Admin signed in',
  denied: 'Someone tried to use the admin area',
  totp: 'Admin login blocked at the second factor',
  invalid: 'Rejected admin request',
  login_failed: 'Failed sign-in at the admin login screen',
}

/**
 * Failed passwords before an alert.
 *
 * One is a typo — the owner mistyping his own password should not page him.
 * Three from one address inside the failure window is someone trying.
 */
const LOGIN_ALERT_AFTER = 3

export async function recordAdminAccess(
  event: H3Event,
  outcome: AuthOutcome,
  detail: { email?: string, reason?: string } = {},
): Promise<void> {
  const ip = ipOf(event)
  const path = event.path || 'unknown'
  const ua = (getRequestHeader(event, 'user-agent') || '').slice(0, 200)
  const email = detail.email ?? ''
  // Set by the observability plugin, so an alert can be traced to one request.
  const requestId = (event.context as { _obsId?: string })._obsId ?? ''
  const at = new Date().toISOString()

  // Never store or transmit the token itself — only whether one worked.
  firestoreRequest('POST', 'admin_access', {
    fields: toFirestoreFields({
      outcome, email, ip, path, ua, requestId,
      reason: detail.reason ?? null,
      createdAt: at,
    }),
  }).catch(() => { /* auditing is best-effort */ })

  await log(
    outcome === 'granted' ? 'info' : 'warn',
    'auth',
    `${LABEL[outcome]}${email ? ` (${email})` : ''}`,
    { outcome, ip, path, reason: detail.reason },
    { requestId, path, ip },
  )

  // ── Alerting ──────────────────────────────────────────────────────────────
  if (outcome === 'granted') {
    // Only a sign-in from an address never used before is worth an email.
    //
    // This replaces a once-per-email+IP-per-day notice. That fired constantly,
    // because a phone changes address by itself, so the alert became routine —
    // and an alert that is routine is one nobody reads closely enough to catch
    // the day it is not. It is the *unfamiliar* address that is the signal.
    const known = await recordAddress(email, ip, ua)

    // Not reliable means the lookup failed, not that the address is new.
    // Emailing on that would raise an intrusion warning over a Firestore
    // hiccup, and the event is in the security log regardless.
    if (!known.isNew || !known.reliable) return
    // Still throttled: if the register itself is failing to persist, this is
    // the backstop that stops a loop from filling the inbox.
    if (!shouldAlert(`new-address:${email}:${ip}`, DAY_MS)) return

    void notifyAdmin({
      level: 'error',
      subject: 'Admin signed in from a new address',
      title: 'First sign-in from this address',
      lines: [
        'The password and the authenticator code were both accepted, from an address that has not signed in before.',
        `Account: ${email || 'unknown'}`,
        `From: ${ip}`,
        'If this was you — a new phone, a different network, or simply a new address from your provider — nothing to do. You will not be told about this address again.',
        'If it was not you, someone has both your password and your second factor. Change the password, then re-enrol the authenticator: that regenerates the TOTP secret, which every session token is signed with, so it signs out whoever is already in.',
        'Addresses already in use before this register existed each produce one notice like this, once.',
      ],
      detail: ua || undefined,
      action: { label: 'Open the security log', url: 'https://sites.ilytat.com/admin' },
    })
    return
  }

  const streak = countFailure(ip)

  // A wrong token is routine; a *repeated* wrong token is someone trying.
  if (outcome === 'invalid' && streak < 5) return
  if (outcome === 'login_failed' && streak < LOGIN_ALERT_AFTER) return
  if (!shouldAlert(`${outcome}:${ip}`, REPEAT_WINDOW_MS)) return
  // Only this outcome originates from an unauthenticated endpoint, so only it
  // needs the global backstop.
  if (outcome === 'login_failed' && !withinUnauthCap()) return

  void notifyAdmin({
    level: 'error',
    subject: outcome === 'denied'
      ? 'Someone tried to reach your admin area'
      : outcome === 'login_failed'
        ? 'Repeated failed sign-ins to your admin area'
        : `Admin access blocked (${outcome})`,
    title: LABEL[outcome],
    lines: [
      outcome === 'denied'
        ? 'A signed-in account that is not on the admin list requested an admin endpoint. They have a working login somewhere — it just is not yours.'
        : outcome === 'totp'
          ? 'The account and password were accepted but the second factor was not. If this was not you, the password is known to someone else.'
          : outcome === 'login_failed'
            ? `${streak} failed sign-in attempts from this address in the last hour. The email below is what they typed, not a verified account.`
            : `${streak} rejected admin requests from this address in the last hour.`,
      `Account: ${email || '(none supplied)'}`,
      `From: ${ip}`,
      `Endpoint: ${path}`,
      'Further alerts for this address are held for an hour.',
    ],
    detail: ua || undefined,
    action: { label: 'Open admin security log', url: 'https://sites.ilytat.com/admin' },
  })
}
