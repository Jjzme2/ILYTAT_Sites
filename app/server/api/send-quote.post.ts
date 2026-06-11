import { z } from 'zod'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'
import { log } from '~/server/utils/logger'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const schema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  phone:   z.string().optional(),
  tier:    z.string().min(1),
  price:   z.string().min(1),
  summary: z.string().min(1),
  answers: z.record(z.union([z.string(), z.array(z.string())])),
})

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid form data.', data: parsed.error.issues })
  }

  const data   = parsed.data
  const config = useRuntimeConfig()

  const lead = {
    name:      data.name,
    email:     data.email,
    phone:     data.phone ?? '',
    tier:      data.tier,
    price:     data.price,
    summary:   data.summary,
    answers:   data.answers,
    createdAt: new Date().toISOString(),
  }

  // Write to Firestore `leads` collection.
  // Public write is intentional — this is a lead capture form with no auth requirement.
  // The server validates and sanitises all fields before writing; Firestore rules are
  // not relied on for security here (write happens via service-account token, not client SDK).
  try {
    await firestoreRequest('POST', 'leads', {
      fields: toFirestoreFields(lead as unknown as Record<string, unknown>),
    })
  }
  catch (err: unknown) {
    await log('error', 'firestore', 'Failed to save quote lead', {
      name:  data.name,
      email: data.email,
      error: err instanceof Error ? err.message : String(err),
    })
    throw createError({ statusCode: 500, message: 'Could not save your quote. Please try again.' })
  }

  await log('info', 'quote', 'New quote lead captured', {
    name: data.name, tier: data.tier, price: data.price,
  })

  // Send notification email via Resend (fire-and-forget — success is not blocked by email delivery)
  // TODO: configure RESEND_API_KEY and NOTIFICATION_EMAIL in .env if not already set
  if (config.resendApiKey && config.notificationEmail) {
    const safeName    = escapeHtml(data.name)
    const safeEmail   = escapeHtml(data.email)
    const safePhone   = data.phone ? escapeHtml(data.phone) : ''
    const safeTier    = escapeHtml(data.tier)
    const safePrice   = escapeHtml(data.price)
    const safeSummary = escapeHtml(data.summary)

    const answersHtml = Object.entries(data.answers)
      .map(([q, a]) => {
        const safeQ = escapeHtml(q)
        const safeA = escapeHtml(Array.isArray(a) ? a.join(', ') : a)
        return `<tr><td style="padding:6px 0;color:#aaa;width:200px;">${safeQ}</td><td style="padding:6px 0;">${safeA}</td></tr>`
      })
      .join('')

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#f5c518;margin-bottom:4px;">New quote lead</h2>
        <p style="color:#888;margin-top:0;font-size:13px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;color:#aaa;width:120px;">Name</td><td style="padding:8px 0;">${safeName}</td></tr>
          <tr><td style="padding:8px 0;color:#aaa;">Email</td><td style="padding:8px 0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          ${safePhone ? `<tr><td style="padding:8px 0;color:#aaa;">Phone</td><td style="padding:8px 0;"><a href="tel:${safePhone}">${safePhone}</a></td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#aaa;">Recommended</td><td style="padding:8px 0;font-weight:bold;">${safeTier} — ${safePrice}</td></tr>
        </table>
        <div style="margin-top:16px;padding:14px;background:#f9f9f9;border-radius:6px;">
          <p style="margin:0;color:#333;font-size:14px;">${safeSummary}</p>
        </div>
        <h3 style="margin-top:24px;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase;">Quiz Answers</h3>
        <table style="width:100%;border-collapse:collapse;">${answersHtml}</table>
        <p style="margin-top:24px;font-size:12px;color:#aaa;">Sent from ilytat.com quote estimator</p>
      </div>
    `

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     config.resendFrom,
        to:       [config.notificationEmail],
        subject:  `New quote lead: ${data.name} — ${data.tier} (${data.price})`,
        html,
        reply_to: data.email,
      }),
    }).catch((e: unknown) =>
      console.error('[send-quote] Email failed:', e instanceof Error ? e.message : String(e)),
    )
  }

  return { success: true }
})
