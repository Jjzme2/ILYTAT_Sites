import { useStripe } from '~/server/utils/stripe'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

// ── Per-package deliverables ───────────────────────────────────────────────
const PACKAGE_DELIVERABLES: Record<string, string[]> = {
  starter: [
    'Single-page responsive website (HTML/CSS/JS source files)',
    'Contact form wired to your email',
    'Google Maps embed',
    'Mobile-optimised layout',
    'Deployment to your chosen host (or ours)',
  ],
  professional: [
    'Up to 5-page responsive website (full source files)',
    'Contact & quote-request forms',
    'Photo gallery / service list section',
    'Basic on-page SEO (meta tags, Open Graph, sitemap)',
    'Google Maps embed',
    'Mobile-optimised layout',
    'Deployment + DNS configuration',
  ],
  premium: [
    'Up to 10-page responsive website (full source files)',
    'Everything in Professional',
    'Booking / scheduling widget integration',
    'Detailed menu or service catalog',
    'Google Analytics 4 setup + basic dashboard',
    'Performance audit & image optimisation pass',
    'Deployment + DNS configuration',
  ],
}

function getDeliverables(packageName: string): string[] {
  const key = packageName.toLowerCase().replace(/[^a-z]/g, '')
  for (const [k, v] of Object.entries(PACKAGE_DELIVERABLES)) {
    if (key.includes(k)) return v
  }
  return ['Custom deliverables — confirm with client at kickoff.']
}

// ── Resend helper ──────────────────────────────────────────────────────────
async function sendEmail(config: ReturnType<typeof useRuntimeConfig>, opts: {
  to: string
  subject: string
  html: string
  replyTo?: string
}) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.resendFrom,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  })
}

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
  } catch {
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
        const deliverables = getDeliverables(order.packageName)
        const deliverablesHtml = deliverables.map(d => `<li style="padding:5px 0;color:#444;">${d}</li>`).join('')
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'full', timeStyle: 'short' })

        // 1. Customer confirmation — what they get and next steps
        if (customerEmail) {
          const customerHtml = `
            <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
              <div style="background:#0f0f11;padding:32px 40px 24px;border-radius:12px 12px 0 0;text-align:center;">
                <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" height="36" style="margin-bottom:16px;">
                <h1 style="color:#f5c518;font-size:22px;margin:0 0 6px;font-weight:700;">You're all set.</h1>
                <p style="color:#8e8ba0;font-size:14px;margin:0;">Payment received — we'll be in touch within 1 business day.</p>
              </div>
              <div style="background:#f9f9f7;padding:32px 40px;border-radius:0 0 12px 12px;">
                <p style="margin:0 0 20px;">Hi ${customerName},</p>
                <p style="margin:0 0 20px;">Your payment of <strong>${amount}</strong> for the <strong>${packageLabel}</strong> package has been received. Your first 30 days of managed hosting are on us — billing begins after your trial period.</p>

                <div style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:24px;text-align:center;margin:0 0 28px;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;">Your first step</p>
                  <h3 style="margin:0 0 12px;font-size:17px;">Complete the onboarding form</h3>
                  <p style="margin:0 0 16px;font-size:14px;color:#666;">Takes about 5 minutes. Drop in your logo, photos, and any info about your business so we can hit the ground running.</p>
                  <a href="${order.onboardingUrl}" style="display:inline-block;background:#f5c518;color:#0f0f11;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;">Open Onboarding Form &rarr;</a>
                </div>

                <h3 style="font-size:15px;margin:0 0 10px;color:#1a1a1a;">What's included in your ${packageLabel} package:</h3>
                <ul style="padding-left:20px;margin:0 0 28px;line-height:1.9;">
                  ${deliverablesHtml}
                </ul>

                <h3 style="font-size:15px;margin:0 0 10px;color:#1a1a1a;">What happens next:</h3>
                <ol style="padding-left:20px;margin:0 0 28px;line-height:2;color:#444;">
                  <li><strong>Complete the onboarding form</strong> — the link above.</li>
                  <li><strong>I review your info</strong> — and reach out within 1 business day to confirm we're aligned.</li>
                  <li><strong>You'll receive a service agreement</strong> — a simple document outlining scope, timeline, and ownership rights. Sign digitally, no printer needed.</li>
                  <li><strong>We build</strong> — your site is crafted with your feedback at every step. Revisions are built in.</li>
                  <li><strong>We launch</strong> — once you love it, we push it live and hand you the keys.</li>
                </ol>

                <p style="margin:0 0 8px;font-size:14px;">Questions? Reply to this email or text/call anytime:</p>
                <p style="margin:0 0 28px;"><a href="tel:+17086271854" style="color:#f5c518;font-weight:600;font-size:15px;">(708) 627-1854</a></p>
                <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
                <p style="margin:0;font-size:12px;color:#999;">ILYTAT LLC · Manteno, IL · <a href="https://ilytat.com" style="color:#999;">ilytat.com</a></p>
              </div>
            </div>
          `
          try {
            await sendEmail(config, {
              to: customerEmail,
              subject: `Order confirmed — ${packageLabel} · ILYTAT`,
              html: customerHtml,
              replyTo: config.notificationEmail || 'jj@ilytat.com',
            })
          }
          catch { /* Email failure is silent — order is saved in Firestore */ }
        }

        // 2. Owner action checklist — everything that needs to go out
        if (config.notificationEmail) {
          const ownerHtml = `
            <div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;">

              <div style="background:#0f0f11;padding:24px 32px;border-radius:10px 10px 0 0;">
                <h1 style="color:#f5c518;font-size:20px;margin:0 0 4px;font-weight:700;">🛒 New purchase — action required</h1>
                <p style="color:#8e8ba0;font-size:13px;margin:0;">${timestamp} CT</p>
              </div>

              <div style="background:#fafaf8;padding:28px 32px;border-radius:0 0 10px 10px;">

                <!-- Order summary -->
                <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px;">
                  <tr style="border-bottom:1px solid #eee;"><td style="padding:9px 0;color:#888;width:140px;">Customer</td><td style="padding:9px 0;font-weight:600;">${order.customerName || '—'}</td></tr>
                  <tr style="border-bottom:1px solid #eee;"><td style="padding:9px 0;color:#888;">Email</td><td style="padding:9px 0;"><a href="mailto:${customerEmail}" style="color:#f5c518;">${customerEmail}</a></td></tr>
                  <tr style="border-bottom:1px solid #eee;"><td style="padding:9px 0;color:#888;">Business</td><td style="padding:9px 0;">${order.businessName || '—'}</td></tr>
                  <tr style="border-bottom:1px solid #eee;"><td style="padding:9px 0;color:#888;">Package</td><td style="padding:9px 0;font-weight:600;">${packageLabel}</td></tr>
                  <tr style="border-bottom:1px solid #eee;"><td style="padding:9px 0;color:#888;">Build fee</td><td style="padding:9px 0;font-weight:600;">${amount}</td></tr>
                  <tr style="border-bottom:1px solid #eee;"><td style="padding:9px 0;color:#888;">Trial ends</td><td style="padding:9px 0;">30 days from today — hosting billing starts then</td></tr>
                  <tr><td style="padding:9px 0;color:#888;">Stripe</td><td style="padding:9px 0;font-size:11px;color:#aaa;">${session.id}</td></tr>
                </table>

                ${order.notes ? `<div style="margin-bottom:28px;padding:14px 18px;background:#fff3cd;border-left:3px solid #f5c518;border-radius:4px;"><p style="margin:0;font-size:13px;font-weight:600;color:#856404;">Client notes:</p><p style="margin:6px 0 0;white-space:pre-wrap;font-size:13px;color:#444;">${order.notes}</p></div>` : ''}

                <!-- ── Action checklist ── -->
                <h2 style="font-size:15px;font-weight:700;margin:0 0 14px;color:#1a1a1a;border-top:2px solid #f5c518;padding-top:20px;">✅ Your action checklist</h2>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                  <tr style="background:#fff;border:1px solid #e8e8e8;">
                    <td style="padding:12px 16px;vertical-align:top;width:28px;font-size:18px;">📧</td>
                    <td style="padding:12px 16px;">
                      <strong>Reply to the customer within 1 business day</strong><br>
                      <span style="color:#666;font-size:13px;">Confirm you received their order, set expectations, and introduce yourself. Reply directly to this email — it goes to <a href="mailto:${customerEmail}" style="color:#f5c518;">${customerEmail}</a>.</span>
                    </td>
                  </tr>
                  <tr style="background:#fafaf8;border:1px solid #e8e8e8;border-top:none;">
                    <td style="padding:12px 16px;vertical-align:top;font-size:18px;">📄</td>
                    <td style="padding:12px 16px;">
                      <strong>Send the service agreement</strong><br>
                      <span style="color:#666;font-size:13px;">Draft and send a simple agreement covering: scope of work, deliverables, revision rounds, payment schedule, and IP/ownership transfer. Use DocuSign, HelloSign, or a plain PDF for digital signature.</span>
                    </td>
                  </tr>
                  <tr style="background:#fff;border:1px solid #e8e8e8;border-top:none;">
                    <td style="padding:12px 16px;vertical-align:top;font-size:18px;">📋</td>
                    <td style="padding:12px 16px;">
                      <strong>Wait for their onboarding form</strong><br>
                      <span style="color:#666;font-size:13px;">They were sent a link to the onboarding questionnaire. Once submitted, you'll have their brand assets, colors, and content to start the build.</span><br>
                      <a href="${order.onboardingUrl}" style="font-size:12px;color:#f5c518;margin-top:4px;display:inline-block;">View onboarding link &rarr;</a>
                    </td>
                  </tr>
                  <tr style="background:#fafaf8;border:1px solid #e8e8e8;border-top:none;">
                    <td style="padding:12px 16px;vertical-align:top;font-size:18px;">📁</td>
                    <td style="padding:12px 16px;">
                      <strong>Create a project folder</strong><br>
                      <span style="color:#666;font-size:13px;">Set up a Google Drive / Notion / GitHub repo for this client. Name it after their business. Use it to store assets, drafts, and final deliverables.</span>
                    </td>
                  </tr>
                  <tr style="background:#fff;border:1px solid #e8e8e8;border-top:none;">
                    <td style="padding:12px 16px;vertical-align:top;font-size:18px;">📞</td>
                    <td style="padding:12px 16px;">
                      <strong>Schedule a kickoff call</strong><br>
                      <span style="color:#666;font-size:13px;">A short 15–30 min call to walk through their goals, answer questions, and align on the project scope. Include a Calendly or Google Meet link in your reply.</span>
                    </td>
                  </tr>
                </table>

                <!-- ── Package deliverables ── -->
                <h2 style="font-size:15px;font-weight:700;margin:28px 0 14px;color:#1a1a1a;border-top:1px solid #eee;padding-top:20px;">📦 ${packageLabel} deliverables</h2>
                <ul style="padding-left:22px;margin:0 0 8px;line-height:1.9;color:#444;font-size:14px;">
                  ${deliverablesHtml}
                </ul>
                <p style="font-size:12px;color:#aaa;margin:10px 0 0;">These should all be handed off to the client at project close.</p>

              </div>
            </div>
          `
          try {
            await sendEmail(config, {
              to: config.notificationEmail,
              subject: `🛒 New order — ${packageLabel} · ${order.customerName || customerEmail} (${amount})`,
              html: ownerHtml,
              replyTo: customerEmail || undefined,
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
            <h2 style="color:#f87171;margin-bottom:4px;">⚠️ Payment failed</h2>
            <p style="color:#888;margin-top:0;font-size:13px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
              <tr><td style="padding:8px 0;color:#aaa;width:150px;">Payment Intent</td><td style="padding:8px 0;font-size:11px;">${pi.id}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa;">Amount</td><td style="padding:8px 0;">$${((pi.amount || 0) / 100).toFixed(2)}</td></tr>
              ${pi.receipt_email ? `<tr><td style="padding:8px 0;color:#aaa;">Customer Email</td><td style="padding:8px 0;"><a href="mailto:${pi.receipt_email}" style="color:#f5c518;">${pi.receipt_email}</a></td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#aaa;">Error Code</td><td style="padding:8px 0;">${errorCode || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#aaa;">Error</td><td style="padding:8px 0;color:#f87171;">${errorMessage}</td></tr>
            </table>
            <p style="margin-top:20px;font-size:13px;color:#555;">Consider following up directly if this was a real customer.</p>
          </div>
        `
        try {
          await sendEmail(config, {
            to: config.notificationEmail,
            subject: `⚠️ Payment failed — ${pi.receipt_email || pi.id}`,
            html,
          })
        }
        catch { /* Email failure is silent — failure is already saved in Firestore */ }
      }

      break
    }

    // Fires ~7 days before the 30-day trial ends — heads-up for both owner and customer
    case 'customer.subscription.trial_will_end': {
      if (!config.resendApiKey) break

      const sub = stripeEvent.data.object
      const trialEnd = sub.trial_end
        ? new Date(sub.trial_end * 1000).toLocaleDateString('en-US', { timeZone: 'America/Chicago', dateStyle: 'long' })
        : 'soon'

      // Retrieve the customer to get their email
      let customerEmail = ''
      let customerName = ''
      if (sub.customer && typeof sub.customer === 'string') {
        try {
          const customer = await stripe.customers.retrieve(sub.customer)
          if (!customer.deleted) {
            customerEmail = customer.email || ''
            customerName = customer.name || ''
          }
        }
        catch { /* non-fatal */ }
      }

      // Owner heads-up
      if (config.notificationEmail) {
        try {
          await sendEmail(config, {
            to: config.notificationEmail,
            subject: `⏰ Trial ending ${trialEnd} — ${customerName || customerEmail || sub.id}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
                <h2 style="color:#f5c518;margin-bottom:4px;">⏰ Trial ending soon</h2>
                <p style="color:#888;margin-top:0;font-size:13px;">Billing starts <strong>${trialEnd}</strong></p>
                <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
                  <tr><td style="padding:8px 0;color:#aaa;width:150px;">Customer</td><td style="padding:8px 0;">${customerName || '—'}</td></tr>
                  <tr><td style="padding:8px 0;color:#aaa;">Email</td><td style="padding:8px 0;"><a href="mailto:${customerEmail}" style="color:#f5c518;">${customerEmail}</a></td></tr>
                  <tr><td style="padding:8px 0;color:#aaa;">Subscription</td><td style="padding:8px 0;font-size:11px;">${sub.id}</td></tr>
                  <tr><td style="padding:8px 0;color:#aaa;">First charge</td><td style="padding:8px 0;font-weight:600;">${trialEnd}</td></tr>
                </table>
                <p style="margin-top:20px;font-size:14px;color:#555;">Verify the project is on track and the client is satisfied before billing kicks in. If there's an issue, you can extend the trial or cancel from the Stripe dashboard.</p>
              </div>
            `,
          })
        }
        catch { /* non-fatal */ }
      }

      // Customer reminder — give them a heads-up their card will be charged
      if (customerEmail) {
        try {
          await sendEmail(config, {
            to: customerEmail,
            subject: `Your ILYTAT free trial ends ${trialEnd}`,
            html: `
              <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a;">
                <div style="background:#0f0f11;padding:28px 36px 20px;border-radius:12px 12px 0 0;text-align:center;">
                  <img src="https://media.ilytat.com/logo.png" alt="ILYTAT" height="32" style="margin-bottom:14px;">
                  <h1 style="color:#f5c518;font-size:20px;margin:0 0 4px;font-weight:700;">Your free trial ends ${trialEnd}</h1>
                  <p style="color:#8e8ba0;font-size:13px;margin:0;">Managed hosting billing begins then.</p>
                </div>
                <div style="background:#f9f9f7;padding:28px 36px;border-radius:0 0 12px 12px;">
                  <p style="margin:0 0 16px;">Hi${customerName ? ` ${customerName}` : ''},</p>
                  <p style="margin:0 0 16px;">Just a reminder that your 30-day free hosting trial ends on <strong>${trialEnd}</strong>. After that, your card will be charged for managed hosting on your regular billing cycle.</p>
                  <p style="margin:0 0 20px;">This covers hosting, SSL, domain renewals, and ongoing updates to your site. Nothing changes for you — we keep everything running.</p>
                  <p style="margin:0 0 8px;font-size:14px;">Questions? Reply to this email or call/text:</p>
                  <p style="margin:0 0 24px;"><a href="tel:+17086271854" style="color:#f5c518;font-weight:600;">(708) 627-1854</a></p>
                  <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0;">
                  <p style="margin:0;font-size:12px;color:#999;">ILYTAT LLC · Manteno, IL · <a href="https://ilytat.com" style="color:#999;">ilytat.com</a></p>
                </div>
              </div>
            `,
            replyTo: config.notificationEmail || 'jj@ilytat.com',
          })
        }
        catch { /* non-fatal */ }
      }

      break
    }
  }

  return { received: true }
})
