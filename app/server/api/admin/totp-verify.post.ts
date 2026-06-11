import { requireAdmin, getTotpSecret } from '~/server/utils/verifyAdmin'
import { verifyTOTP, signTOTPSession } from '~/server/utils/totp'

export default defineEventHandler(async (event) => {
  // Requires valid Firebase admin auth; TOTP session itself is what we're issuing here.
  await requireAdmin(event, { skipTotp: true })

  const body = await readBody<{ code?: string }>(event)
  if (!body?.code || !/^\d{6}$/.test(body.code)) {
    throw createError({ statusCode: 400, message: 'Invalid code format' })
  }

  const secret = await getTotpSecret()
  if (!secret) {
    // TOTP is not configured — no verification needed, return a dummy token so
    // the client knows it's fine to proceed.
    return { sessionToken: 'totp-disabled' }
  }

  if (!verifyTOTP(secret, body.code)) {
    throw createError({ statusCode: 401, message: 'Invalid or expired TOTP code' })
  }

  // Derive the uid from the Authorization token (we already verified it in requireAdmin,
  // so just use the email as the uid for the session token).
  const authHeader = getHeader(event, 'authorization') ?? ''
  const idToken = authHeader.slice(7)
  const config = useRuntimeConfig()

  let uid = 'admin'
  try {
    const res  = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${config.public.firebaseApiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
    })
    const data = await res.json() as { users?: Array<{ localId?: string }> }
    uid = data.users?.[0]?.localId ?? 'admin'
  } catch { /* keep uid = 'admin' */ }

  return { sessionToken: signTOTPSession(uid, secret) }
})
