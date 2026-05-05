import { getRequestIP } from 'h3'
import { z } from 'zod'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'
import { log } from '~/server/utils/logger'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escape characters with special meaning in HTML to prevent injection via email clients. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Verifies a Cloudflare Turnstile challenge token against the Turnstile API.
 *
 * Why: Turnstile is a CAPTCHA replacement that challenges bots silently.
 * The widget issues a short-lived token on the client; we verify it here so
 * the token cannot be reused or fabricated.
 */
async function verifyTurnstileToken(token: string, secretKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    })
    const data = await res.json() as { success: boolean }
    return data.success === true
  }
  catch {
    // If the Turnstile API itself is unreachable, fail closed (block the submission).
    return false
  }
}

/**
 * Detects obvious gibberish strings — sequences of mostly consonants with no
 * meaningful vowel ratio (e.g. "xkzpqwmf"). Real names and business names
 * always contain vowels.
 *
 * Why: Catches automated spam that slips past Turnstile or fills honeypots
 * with plausible-looking random strings rather than real words.
 */
function isGibberish(text: string): boolean {
  const lettersOnly = text.toLowerCase().replace(/[^a-z]/g, '')
  if (lettersOnly.length < 5) return false
  const vowelCount = (lettersOnly.match(/[aeiou]/g) ?? []).length
  // Genuine words in English average ~38% vowels; spam runs ~0–8%.
  return vowelCount / lettersOnly.length < 0.1
}

/**
 * Persists a blocked submission to the `spamAttempts` Firestore collection.
 *
 * Why: General logs are a stream of all app activity. Spam attempts need their
 * own collection so the admin UI can surface them as actionable security events
 * without drowning in noise. Each record includes network metadata (IP,
 * user-agent) to help identify patterns across multiple attacks.
 *
 * Fire-and-forget — blocking the response on a DB write for a bot is unnecessary.
 */
function recordSpamAttempt(
  reason: 'honeypot' | 'turnstile' | 'gibberish',
  email: string,
  name: string,
  ip: string,
  userAgent: string,
): void {
  firestoreRequest('POST', 'spamAttempts', {
    fields: toFirestoreFields({ reason, email, name, ip, userAgent, createdAt: new Date().toISOString() }),
  }).catch(err => console.error('[spam] Failed to record spam attempt:', err.message))
}

// ─── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  name:              z.string().min(2),
  email:             z.string().email(),
  businessName:      z.string().min(1),
  phone:             z.string().optional(),
  service:           z.string(),
  billingPreference: z.string().optional(),
  message:           z.string().min(10).max(2000),
  /** Cloudflare Turnstile token issued after the client-side challenge passes. */
  cfTurnstileToken:  z.string().min(1, 'Bot check required.'),
  /**
   * Honeypot — must be absent or empty.
   * Bots fill every visible and hidden field; a non-empty value here is a
   * near-certain signal of automated submission.
   */
  honeypot:          z.string().max(0, 'Bot detected.').optional(),
})

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid form data provided.', data: parsed.error.issues })
  }

  const data      = parsed.data
  const config    = useRuntimeConfig()
  const ip        = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const userAgent = getRequestHeader(event, 'user-agent') ?? 'unknown'

  // ── Layer 1: Honeypot ───────────────────────────────────────────────────────
  // A non-empty honeypot field means an automated agent filled it.
  // Return 200 to avoid telling the bot it was caught.
  if (data.honeypot) {
    recordSpamAttempt('honeypot', data.email, data.name, ip, userAgent)
    await log('warn', 'spam', 'Honeypot triggered — submission silently dropped', { email: data.email, ip })
    return { success: true }
  }

  // ── Layer 2: Cloudflare Turnstile ───────────────────────────────────────────
  // Skipped entirely in dev — import.meta.dev is tree-shaken to false in production
  // so this branch is completely absent from prod bundles.
  if (!import.meta.dev) {
    const turnstileValid = await verifyTurnstileToken(data.cfTurnstileToken, config.turnstileSecretKey)
    if (!turnstileValid) {
      recordSpamAttempt('turnstile', data.email, data.name, ip, userAgent)
      await log('warn', 'spam', 'Turnstile verification failed', { email: data.email, ip })
      throw createError({ statusCode: 400, message: 'Bot check failed. Please refresh and try again.' })
    }
  }

  // ── Layer 3: Gibberish detection ────────────────────────────────────────────
  // Reject submissions where the name OR message looks like random character spam.
  if (isGibberish(data.name) || isGibberish(data.message)) {
    recordSpamAttempt('gibberish', data.email, data.name, ip, userAgent)
    await log('warn', 'spam', 'Gibberish content detected — submission rejected', { email: data.email, name: data.name, ip })
    throw createError({ statusCode: 400, message: 'Your message could not be processed. Please use plain language and try again.' })
  }

  // Destructure out the bot-protection fields — they are not business data
  // and must not be stored in Firestore.
  const { cfTurnstileToken: _token, honeypot: _hp, ...cleanData } = data

  const inquiry = {
    ...cleanData,
    status: 'new',
    createdAt: new Date().toISOString(),
  }

  // 1. Save to Firestore
  try {
    await firestoreRequest('POST', 'inquiries', {
      fields: toFirestoreFields(inquiry),
    })
  }
  catch (err: unknown) {
    await log('error', 'firestore', 'Failed to save inquiry', {
      name: data.name,
      email: data.email,
      error: err instanceof Error ? err.message : String(err),
    })
    throw createError({ statusCode: 500, message: 'Internal server error while saving message. Please try again later.' })
  }

  await log('info', 'contact', 'New inquiry received', {
    name:         data.name,
    businessName: data.businessName,
    service:      data.service || 'Not specified',
  })

  // 2. Send email notification via Resend (fire-and-forget — form success is not blocked by email)
  if (config.resendApiKey && config.notificationEmail) {
    const safeName     = escapeHtml(data.name)
    const safeBiz      = escapeHtml(data.businessName)
    const safeEmail    = escapeHtml(data.email)
    const safePhone    = data.phone ? escapeHtml(data.phone) : ''
    const safeService  = escapeHtml(data.service || 'Not specified')
    const safeMessage  = escapeHtml(data.message)
    const safeBilling  = data.billingPreference === 'yearly' ? 'Yearly ($799/yr)' : 'Monthly ($89/mo)'

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#f5c518;margin-bottom:4px;">New inquiry</h2>
        <p style="color:#888;margin-top:0;font-size:13px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;color:#aaa;width:120px;">Name</td><td style="padding:8px 0;">${safeName}</td></tr>
          <tr><td style="padding:8px 0;color:#aaa;">Business</td><td style="padding:8px 0;">${safeBiz}</td></tr>
          <tr><td style="padding:8px 0;color:#aaa;">Email</td><td style="padding:8px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          ${safePhone ? `<tr><td style="padding:8px 0;color:#aaa;">Phone</td><td style="padding:8px 0;"><a href="tel:${safePhone}">${safePhone}</a></td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#aaa;">Package</td><td style="padding:8px 0;">${safeService}</td></tr>
          ${data.billingPreference ? `<tr><td style="padding:8px 0;color:#aaa;">Billing Option</td><td style="padding:8px 0;">${safeBilling}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;padding:16px;background:#f9f9f9;border-radius:6px;">
          <p style="margin:0;white-space:pre-wrap;color:#333;">${safeMessage}</p>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#aaa;">Sent from ilytat.com contact form</p>
      </div>
    `

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.resendFrom,
          to: [config.notificationEmail],
          subject: `New inquiry: ${data.name} — ${data.businessName}`,
          html,
          reply_to: data.email,
        }),
      })
    }
    catch (e) {
      await log('error', 'email', 'Inquiry notification email failed', {
        name:  data.name,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return { success: true }
})
