import { z } from 'zod'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  businessName: z.string().min(1),
  phone: z.string().optional(),
  service: z.string(),
  billingPreference: z.string().optional(),
  message: z.string().min(10).max(2000),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid form data provided.', data: parsed.error.issues })
  }
  
  const data = parsed.data

  const inquiry = {
    ...data,
    status: 'new',
    createdAt: new Date().toISOString(),
  }

  // 1. Save to Firestore
  try {
    await firestoreRequest('POST', 'inquiries', {
      fields: toFirestoreFields(inquiry),
    })
  } catch (err: any) {
    console.error('[Contact API] Failed to save inquiry:', err.message);
    throw createError({ statusCode: 500, message: 'Internal server error while saving message. Please try again later.' });
  }

  // 2. Send email notification via Resend (fire-and-forget — form success is not blocked by email)
  const config = useRuntimeConfig()
  if (config.resendApiKey && config.notificationEmail) {
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#f5c518;margin-bottom:4px;">New inquiry</h2>
        <p style="color:#888;margin-top:0;font-size:13px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px 0;color:#aaa;width:120px;">Name</td><td style="padding:8px 0;">${data.name}</td></tr>
          <tr><td style="padding:8px 0;color:#aaa;">Business</td><td style="padding:8px 0;">${data.businessName}</td></tr>
          <tr><td style="padding:8px 0;color:#aaa;">Email</td><td style="padding:8px 0;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          ${data.phone ? `<tr><td style="padding:8px 0;color:#aaa;">Phone</td><td style="padding:8px 0;"><a href="tel:${data.phone}">${data.phone}</a></td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#aaa;">Package</td><td style="padding:8px 0;">${data.service || 'Not specified'}</td></tr>
          ${data.billingPreference ? `<tr><td style="padding:8px 0;color:#aaa;">Billing Option</td><td style="padding:8px 0;">${data.billingPreference === 'yearly' ? 'Yearly ($799/yr)' : 'Monthly ($89/mo)'}</td></tr>` : ''}
        </table>
        <div style="margin-top:20px;padding:16px;background:#f9f9f9;border-radius:6px;">
          <p style="margin:0;white-space:pre-wrap;color:#333;">${data.message}</p>
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
    catch {
      // Email failure is silent — inquiry is already saved in Firestore
    }
  }

  return { success: true }
})
