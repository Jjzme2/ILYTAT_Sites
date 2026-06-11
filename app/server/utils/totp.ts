import crypto from 'node:crypto'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function b32decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, acc = 0
  const bytes: number[] = []
  for (const c of clean) {
    acc = (acc << 5) | B32.indexOf(c)
    bits += 5
    if (bits >= 8) { bytes.push((acc >>> (bits - 8)) & 0xff); bits -= 8 }
  }
  return Buffer.from(bytes)
}

function b32encode(buf: Buffer): string {
  let out = '', bits = 0, acc = 0
  for (const b of buf) {
    acc = (acc << 8) | b; bits += 8
    while (bits >= 5) { out += B32[(acc >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits) out += B32[(acc << (5 - bits)) & 31]
  return out
}

function hotp(secret: string, counter: bigint): string {
  const key  = b32decode(secret)
  const msg  = Buffer.alloc(8)
  msg.writeBigUInt64BE(counter)
  const h    = crypto.createHmac('sha1', key).update(msg).digest()
  const off  = h[19] & 0x0f
  const code = (((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16) | ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff)) % 1_000_000
  return code.toString().padStart(6, '0')
}

export function generateTOTPSecret(): string {
  return b32encode(crypto.randomBytes(20))
}

export function verifyTOTP(secret: string, code: string, windowSteps = 1): boolean {
  const t = BigInt(Math.floor(Date.now() / 30_000))
  for (let i = -windowSteps; i <= windowSteps; i++) {
    if (hotp(secret, t + BigInt(i)) === code) return true
  }
  return false
}

export function getTOTPUri(secret: string, account: string, issuer = 'ILYTAT Admin'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

// Stateless session token: `uid.exp.hmac`
// Signed with TOTP secret so rotating the secret invalidates all sessions.
const SESSION_SALT = ':totp-session-v1'

export function signTOTPSession(uid: string, totpSecret: string, ttlSecs = 86_400): string {
  const exp     = Math.floor(Date.now() / 1000) + ttlSecs
  const payload = `${uid}.${exp}`
  const sig     = crypto.createHmac('sha256', totpSecret + SESSION_SALT).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyTOTPSession(token: string, totpSecret: string): string | null {
  if (!token) return null
  const dot2 = token.lastIndexOf('.')
  const dot1 = token.lastIndexOf('.', dot2 - 1)
  if (dot1 === -1 || dot2 === -1) return null
  const uid     = token.slice(0, dot1)
  const expStr  = token.slice(dot1 + 1, dot2)
  const sig     = token.slice(dot2 + 1)
  const payload = `${uid}.${expStr}`
  const expected = crypto.createHmac('sha256', totpSecret + SESSION_SALT).update(payload).digest('base64url')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url'))) return null
  } catch {
    return null
  }
  if (Number(expStr) < Math.floor(Date.now() / 1000)) return null
  return uid
}
