import { useStripe } from '~/server/utils/stripe'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  const stripe = useStripe()
  const config = useRuntimeConfig()

  const body = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')

  if (!body || !sig) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, config.stripeWebhookSecret)
  } catch (_err) {
    throw createError({ statusCode: 400, message: `Webhook signature verification failed` })
  }

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object
      const meta = session.metadata || {}

      const order = {
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string || '',
        serviceId: meta.serviceId || '',
        packageId: meta.packageId || '',
        serviceName: meta.serviceName || '',
        packageName: meta.packageName || '',
        userId: meta.userId || '',
        businessName: meta.businessName || '',
        notes: meta.notes || '',
        customerEmail: session.customer_email || session.customer_details?.email || '',
        customerName: session.customer_details?.name || '',
        amount: (session.amount_total || 0) / 100,
        status: 'paid',
        deliverables: [],
        onboardingUrl: `${config.public.siteUrl}/onboarding?session_id=${session.id}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await firestoreRequest('POST', 'orders', {
        fields: toFirestoreFields(order),
      })

      // ── Email notifications via Resend (fire-and-forget) ──────────────────
      if (config.resendApiKey) {
        const customerEmail = order.customerEmail
        const customerName = order.customerName || 'there'
        const packageLabel = order.packageName || order.serviceName || 'your package'
        const amount = `$${order.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`

        // 1. Customer confirmation
        if (customerEmail) {
          const customerHtml = `
            <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
              <div style="background:#0f0f11;padding:32px 40px 24px;border-radius:12px 12px 0 0;text-align:center;">
                <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" height="36" style="margin-bottom:16px;">
                <h1 style="color:#f5c518;font-size:22px;margin:0 0 6px;font-weight:700;">You're all set.</h1>
                <p style="color:#8e8ba0;font-size:14px;margin:0;">Payment received — we'll be in touch shortly.</p>
              </div>
              <div style="background:#f9f9f7;padding:32px 40px;border-radius:0 0 12px 12px;">
                <p style="margin:0 0 20px;">Hi ${customerName},</p>
                <p style="margin:0 0 20px;">Your payment of <strong>${amount}</strong> for the <strong>${packageLabel}</strong> package has been received. Here's what happens next:</p>
                <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px;">
                  <h3 style="margin:0 0 12px;font-size:16px;">Step 1: Provide Your Details</h3>
                  <p style="margin:0 0 16px;font-size:14px;color:#666;">To get started, we need a bit more info and any assets (logos, photos) you want to include.</p>
                  <a href="${order.onboardingUrl}" style="display:inline-block;background:#f5c518;color:#0f0f11;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;">Complete Onboarding Form &rarr;</a>
                </div>
                <ol style="padding-left:20px;margin:0 0 24px;line-height:2;">
                  <li><strong>Complete the form above:</strong> It takes about 5 minutes.</li>
                  <li><strong>Strategy Review:</strong> I'll review your order and reach out within 1 business day.</li>
                  <li><strong>Design & Build:</strong> We begin crafting your site — with your feedback built in every step.</li>
                </ol>
                <p style="margin:0 0 8px;">Questions in the meantime? Reply to this email or text/call directly:</p>
                <p style="margin:0 0 24px;"><a href="tel:+17086271854" style="color:#f5c518;font-weight:600;">(708) 627-1854</a></p>
                <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
                <p style="margin:0;font-size:12px;color:#999;">ILYTAT LLC · Manteno, IL · <a href="https://ilytat.com" style="color:#999;">ilytat.com</a></p>
              </div>
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
                to: [customerEmail],
                subject: `Your ILYTAT order is confirmed — ${packageLabel}`,
                html: customerHtml,
                reply_to: config.notificationEmail || 'jj@ilytat.com',
              }),
            })
          }
          catch { /* Email failure is silent — order is saved in Firestore */ }
        }

        // 2. Owner notification
        if (config.notificationEmail) {
          const ownerHtml = `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
              <h2 style="color:#f5c518;margin-bottom:4px;">New order — ${packageLabel}</h2>
              <p style="color:#888;margin-top:0;font-size:13px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
              <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <tr><td style="padding:8px 0;color:#aaa;width:130px;">Customer</td><td style="padding:8px 0;">${order.customerName || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#aaa;">Email</td><td style="padding:8px 0;"><a href="mailto:${order.customerEmail}">${order.customerEmail}</a></td></tr>
                <tr><td style="padding:8px 0;color:#aaa;">Business</td><td style="padding:8px 0;">${order.businessName || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#aaa;">Package</td><td style="padding:8px 0;">${packageLabel}</td></tr>
                <tr><td style="padding:8px 0;color:#aaa;">Amount</td><td style="padding:8px 0;font-weight:600;">${amount}</td></tr>
                <tr><td style="padding:8px 0;color:#aaa;">Stripe Session</td><td style="padding:8px 0;font-size:11px;">${session.id}</td></tr>
              </table>
              ${order.notes ? `<div style="margin-top:20px;padding:16px;background:#f9f9f9;border-radius:6px;"><p style="margin:0;white-space:pre-wrap;color:#333;">${order.notes}</p></div>` : ''}
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
                subject: `New order: ${order.customerName || order.customerEmail} — ${packageLabel} (${amount})`,
                html: ownerHtml,
                reply_to: order.customerEmail || undefined,
              }),
            })
          }
          catch { /* Email failure is silent */ }
        }
      }

      break
    }

    case 'payment_intent.payment_failed': {
      const pi = stripeEvent.data.object
      const errorMessage = pi.last_payment_error?.message || 'Unknown error'
      const errorCode = pi.last_payment_error?.code || ''

      // Persist to Firestore so no failure is lost
      await firestoreRequest('POST', 'payment_failures', {
        fields: toFirestoreFields({
          paymentIntentId: pi.id,
          amount: (pi.amount || 0) / 100,
          currency: pi.currency || 'usd',
          customerEmail: pi.receipt_email || '',
          errorCode,
          errorMessage,
          metadata: pi.metadata || {},
          createdAt: new Date().toISOString(),
        }),
      })

      // Notify owner so failed payments can be followed up on
      if (config.resendApiKey && config.notificationEmail) {
        const html = `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#f87171;margin-bottom:4px;">Payment failed</h2>
            <p style="color:#888;margin-top:0;font-size:13px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <tr><td style="padding:8px 0;color:#aaa;width:150px;">Payment Intent</td><td style="padding:8px 0;font-size:12px;">${pi.id}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa;">Amount</td><td style="padding:8px 0;">$${((pi.amount || 0) / 100).toFixed(2)}</td></tr>
              ${pi.receipt_email ? `<tr><td style="padding:8px 0;color:#aaa;">Customer Email</td><td style="padding:8px 0;"><a href="mailto:${pi.receipt_email}">${pi.receipt_email}</a></td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#aaa;">Error Code</td><td style="padding:8px 0;">${errorCode || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa;">Error</td><td style="padding:8px 0;color:#f87171;">${errorMessage}</td></tr>
            </table>
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
              subject: `Payment failed — ${pi.receipt_email || pi.id}`,
              html,
            }),
          })
        }
        catch { /* Email failure is silent — failure is already saved in Firestore */ }
      }

      break
    }
  }

  return { received: true }
})
