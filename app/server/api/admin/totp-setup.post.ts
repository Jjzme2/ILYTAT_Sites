import { requireAdmin, bustTotpCache } from '~/server/utils/verifyAdmin'
import { generateTOTPSecret, getTOTPUri, verifyTOTP } from '~/server/utils/totp'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'
import QRCode from 'qrcode'

export default defineEventHandler(async (event) => {
  // Requires existing Firebase admin auth (no TOTP since this is the setup flow).
  await requireAdmin(event, { skipTotp: true })

  const body = await readBody<{ action: 'generate' | 'save', secret?: string, code?: string }>(event)

  if (body.action === 'generate') {
    // Generate a fresh secret and return it with a QR code — nothing saved yet.
    const secret = generateTOTPSecret()
    const authHeader = getHeader(event, 'authorization') ?? ''
    const idToken = authHeader.slice(7)
    const config = useRuntimeConfig()

    let email = 'admin@ilytat.com'
    try {
      const res  = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${config.public.firebaseApiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
      })
      const data = await res.json() as { users?: Array<{ email?: string }> }
      email = data.users?.[0]?.email ?? email
    } catch { /* keep default */ }

    const uri   = getTOTPUri(secret, email)
    const qrPng = await QRCode.toDataURL(uri, { width: 200, margin: 1, color: { dark: '#000', light: '#fff' } })
    return { secret, qrDataUrl: qrPng }
  }

  if (body.action === 'save') {
    // Verify the code against the provided secret before saving.
    if (!body.secret || !body.code || !/^\d{6}$/.test(body.code)) {
      throw createError({ statusCode: 400, message: 'Missing secret or code' })
    }
    if (!verifyTOTP(body.secret, body.code)) {
      throw createError({ statusCode: 400, message: 'Code does not match — make sure your authenticator is synced' })
    }

    await firestoreRequest('PATCH', 'adminConfig/totp?updateMask.fieldPaths=secret', {
      fields: toFirestoreFields({ secret: body.secret }),
    })
    bustTotpCache()
    return { ok: true }
  }

  if (body.action === 'disable') {
    try { await firestoreRequest('DELETE', 'adminConfig/totp') } catch { /* already absent */ }
    bustTotpCache()
    return { ok: true }
  }

  throw createError({ statusCode: 400, message: 'Unknown action' })
})
