/**
 * requireAdmin — server-side Firebase ID token verification.
 *
 * Reads the `Authorization: Bearer <idToken>` header, validates the token
 * against the Firebase REST API, and checks that the authenticated user's
 * email is in the admin list.
 *
 * When TOTP 2FA is enabled (secret stored in Firestore adminConfig/totp),
 * also validates the `X-TOTP-Session` header unless skipTotp is true.
 *
 * Throws 401 if the token is missing or invalid; 403 if the user is not admin.
 *
 * Usage:
 *   import { requireAdmin } from '~/server/utils/verifyAdmin'
 *   export default defineEventHandler(async (event) => {
 *     await requireAdmin(event)
 *     // ... rest of handler
 *   })
 */

import type { H3Event } from 'h3'
import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'
import { verifyTOTPSession } from '~/server/utils/totp'
import { recordAdminAccess } from '~/server/utils/adminAudit'
import { log } from '~/server/utils/logger'
import { clientIp, rateLimit } from '~/server/utils/guard'

// Cache the TOTP secret in memory to avoid a Firestore round-trip on every request.
let _totpCache: { secret: string | null, at: number } | null = null
const TOTP_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getTotpSecret(): Promise<string | null> {
  if (_totpCache && Date.now() - _totpCache.at < TOTP_CACHE_TTL) {
    return _totpCache.secret
  }
  try {
    const doc  = await firestoreRequest('GET', 'adminConfig/totp')
    const data = fromFirestoreFields(doc.fields || {})
    const secret = (data.secret as string) || null
    _totpCache = { secret, at: Date.now() }
    return secret
  }
  catch {
    // If Firestore is unavailable, don't enforce TOTP to avoid lockouts.
    // Retain any existing cache entry rather than caching a null.
    //
    // Note what this means: with no cached secret and Firestore down, two-factor
    // silently stops applying and the admin API falls back to password-only.
    // That is the right trade — being locked out of your own site during an
    // outage is worse — but it must not be silent, or the one window where the
    // second factor is off is also the one window nothing says so.
    const fallback = _totpCache?.secret ?? null
    if (!fallback) {
      void log('warn', 'auth', 'TOTP not enforced — could not read the secret from Firestore', {
        effect: 'admin API is password-only until Firestore recovers',
      })
    }
    return fallback
  }
}

/** Call this to bust the cache immediately after writing a new secret. */
export function bustTotpCache() {
  _totpCache = null
}

export async function requireAdmin(event: H3Event, opts: { skipTotp?: boolean } = {}): Promise<void> {
  // Bounds credential-stuffing against the admin API. Deliberately generous —
  // the admin UI issues several calls per screen, so this only bites a script.
  // It is a cap on attempts, not a substitute for the audit trail below.
  rateLimit({
    scope: 'admin-auth',
    ip: clientIp(event),
    max: 120,
    windowMs: 60_000,
    message: 'Too many admin requests. Wait a minute and try again.',
  })

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    await recordAdminAccess(event, 'invalid', { reason: 'no bearer token' })
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const idToken = authHeader.slice(7)
  const config = useRuntimeConfig()

  // Verify the Firebase ID token via the accounts:lookup REST endpoint.
  // This validates the token signature server-side and returns the user record.
  let email: string | undefined
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${config.public.firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )
    if (!res.ok) throw new Error(`Firebase returned ${res.status}`)
    const data = await res.json() as { users?: Array<{ email?: string, localId?: string }> }
    email = data.users?.[0]?.email
  }
  catch {
    await recordAdminAccess(event, 'invalid', { reason: 'token rejected by Firebase' })
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  if (!email) {
    await recordAdminAccess(event, 'invalid', { reason: 'token contains no email' })
    throw createError({ statusCode: 401, message: 'Token contains no email' })
  }

  // Admin email list — override via ADMIN_EMAILS env var (comma-separated)
  const rawList = (config.adminEmails as string | undefined) || 'admin@ilytat.com'
  const adminEmails = rawList.split(',').map(e => e.trim().toLowerCase())

  if (!adminEmails.includes(email.toLowerCase())) {
    // The one that matters: a real, authenticated account that is not yours.
    await recordAdminAccess(event, 'denied', { email, reason: 'not on the admin list' })
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // TOTP second-factor check (skipped by TOTP-specific endpoints)
  if (!opts.skipTotp) {
    const totpSecret = await getTotpSecret()
    if (totpSecret) {
      const sessionToken = getHeader(event, 'x-totp-session') ?? ''
      const uid = verifyTOTPSession(sessionToken, totpSecret)
      if (!uid) {
        await recordAdminAccess(event, 'totp', {
          email,
          reason: sessionToken ? 'TOTP session invalid or expired' : 'no TOTP session supplied',
        })
        throw createError({ statusCode: 401, message: 'TOTP session required' })
      }
    }
  }

  await recordAdminAccess(event, 'granted', { email })
}
