/**
 * POST /api/admin/login-event
 *
 * Records sign-in attempts made at the admin login screen.
 *
 * This exists because the admin login does not touch our server at all.
 * `signInWithEmailAndPassword` runs in the browser against Firebase directly,
 * so a wrong password sets an error message in the page and nothing else — no
 * request, no log, no alert. Every other guard in the admin path fires only
 * once a caller already holds a token, which means the single most likely
 * attack, guessing the password, was the one thing producing no signal at all.
 *
 * ── Why this endpoint is public, and what that costs ──────────────────────
 *
 * It has to be. The caller has not authenticated — that is the event being
 * reported. So everything it accepts is untrusted:
 *
 *   - The email is what was *typed*, never a verified account. It is recorded
 *     and shown as a claim, and the alert says so.
 *   - Nothing is echoed back; the response is a bare 204 either way, so this
 *     cannot be used to probe which addresses exist.
 *   - A public endpoint that can send email is an inbox-flood vector, so it is
 *     rate limited per IP here, throttled per IP per hour in the audit layer,
 *     and capped globally per day as a backstop against a distributed flood.
 *
 * Success is recorded but never alerted on. A client claiming it signed in
 * proves nothing, and the authoritative signal already exists: the first
 * server-side call after login goes through requireAdmin and records `granted`.
 * Alerting here too would mean two emails for one sign-in, one of them
 * forgeable.
 */

import { z } from 'zod'
import { clientIp, rateLimit } from '~/server/utils/guard'
import { recordAdminAccess } from '~/server/utils/adminAudit'
import { log } from '~/server/utils/logger'

const schema = z.object({
  outcome: z.enum(['failed', 'succeeded']),
  // Present only so a report can say which address was tried. Length-capped
  // and never trusted as identity.
  email: z.string().max(120).optional().default(''),
  /** Firebase's own error code, e.g. auth/wrong-password. */
  code: z.string().max(60).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)

  // Tighter than the authenticated admin limit: a human signing in makes a
  // handful of attempts, not dozens.
  rateLimit({ scope: 'admin-login-event', ip, max: 12, windowMs: 5 * 60_000 })

  const parsed = schema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) return setResponseStatus(event, 204)
  const { outcome, email, code } = parsed.data

  if (outcome === 'failed') {
    await recordAdminAccess(event, 'login_failed', {
      email,
      reason: code || 'sign-in rejected by Firebase',
    })
  }
  else {
    // Recorded for the security log only — see the note above on why this is
    // not alerted on.
    await log('info', 'auth', 'Admin sign-in succeeded at the login screen', {
      email,
      ip,
      note: 'client-reported; the authoritative record is the granted entry from requireAdmin',
    }, { ip })
  }

  return setResponseStatus(event, 204)
})
