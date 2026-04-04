/**
 * GET /api/cron/nightly-report
 *
 * Scheduled via vercel.json — runs nightly at 2 AM CT.
 * Can also be triggered manually with:
 *   curl -H "x-cron-secret: <CRON_SECRET>" https://ilytat.com/api/cron/nightly-report
 *
 * Pulls the last 24 hours of:
 *   - App logs (from the `logs` collection, prioritised critical → info)
 *   - New orders, inquiries, payment failures
 *   - Analytics funnel
 *
 * Sends a single HTML digest to NOTIFICATION_EMAIL via Resend.
 */

import { firestoreRunQuery, firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'
import { log } from '~/server/utils/logger'

// ── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id:        string
  level:     string
  area:      string
  message:   string
  data:      string | null
  priority:  number
  createdAt: string
}

interface Order {
  id:            string
  packageName:   string
  customerName:  string
  customerEmail: string
  businessName:  string
  amount:        number
  createdAt:     string
}

interface Inquiry {
  id:           string
  name:         string
  businessName: string
  email:        string
  service:      string
  createdAt:    string
}

interface PaymentFailure {
  id:            string
  customerEmail: string
  amount:        number
  errorMessage:  string
  createdAt:     string
}

interface AnalyticsEvent {
  event:     string
  createdAt: string
  props:     string
}

// ── Auth guard ────────────────────────────────────────────────────────────────

function isAuthorised(event: ReturnType<typeof defineEventHandler> extends (...args: infer A) => unknown ? A[0] : never): boolean {
  const config = useRuntimeConfig()
  const secret = config.cronSecret as string
  if (!secret) return false
  // Vercel sets x-vercel-cron on legitimate scheduled calls
  const vercelCron = getHeader(event, 'x-vercel-cron')
  const provided   = getHeader(event, 'x-cron-secret')
  return vercelCron === '1' || provided === secret
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ct(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone:  'America/Chicago',
    month:     'short',
    day:       'numeric',
    hour:      '2-digit',
    minute:    '2-digit',
    hour12:    true,
  })
}

function badge(level: string): string {
  const map: Record<string, string> = {
    critical: 'background:#dc2626;color:#fff;',
    error:    'background:#ea580c;color:#fff;',
    warn:     'background:#d97706;color:#fff;',
    info:     'background:#6b7280;color:#fff;',
  }
  return `<span style="font-size:10px;font-weight:700;letter-spacing:1px;padding:2px 7px;border-radius:3px;text-transform:uppercase;${map[level] ?? map.info}">${level}</span>`
}

function areaTag(area: string): string {
  return `<span style="font-size:11px;color:#6b7280;font-family:monospace;">[${area}]</span>`
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildEmail(opts: {
  date:       string
  logs:       LogEntry[]
  orders:     Order[]
  inquiries:  Inquiry[]
  failures:   PaymentFailure[]
  analytics:  { pricingViewed: number; initiated: number; abandoned: number; paid: number; convRate: string }
}): { subject: string; html: string } {
  const { date, logs, orders, inquiries, failures, analytics } = opts

  const criticals = logs.filter(l => l.level === 'critical')
  const errors    = logs.filter(l => l.level === 'error')
  const warnings  = logs.filter(l => l.level === 'warn')
  const revenue   = orders.reduce((s, o) => s + (o.amount || 0), 0)

  // Subject line
  const alertSummary = criticals.length
    ? `🚨 ${criticals.length} critical`
    : errors.length
      ? `⚠️ ${errors.length} error${errors.length > 1 ? 's' : ''}`
      : '✅ All clear'
  const subject = `ILYTAT Nightly Report — ${date} · ${alertSummary}`

  // ── Alert rows ────────────────────────────────────────────────────────────
  function logRows(entries: LogEntry[]): string {
    if (!entries.length) return ''
    return entries.map(e => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;white-space:nowrap;font-size:12px;color:#9ca3af;">${ct(e.createdAt)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;">${badge(e.level)} ${areaTag(e.area)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;font-size:13px;color:#111827;">${e.message}${e.data ? `<br><span style="font-size:11px;color:#9ca3af;font-family:monospace;">${e.data}</span>` : ''}</td>
      </tr>`).join('')
  }

  const alertSection = (criticals.length || errors.length || warnings.length) ? `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f5c518;">
        ⚠️ Alerts (${criticals.length + errors.length + warnings.length})
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:.5px;text-transform:uppercase;">Time (CT)</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:.5px;text-transform:uppercase;">Level</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;letter-spacing:.5px;text-transform:uppercase;">Message</th>
          </tr>
        </thead>
        <tbody>${logRows(criticals)}${logRows(errors)}${logRows(warnings)}</tbody>
      </table>
    </div>` : `
    <div style="margin-bottom:32px;padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">✅ No warnings or errors in the last 24 hours.</p>
    </div>`

  // ── Orders section ────────────────────────────────────────────────────────
  const ordersSection = `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f5c518;">
        💰 Revenue (24h) — ${orders.length} order${orders.length !== 1 ? 's' : ''} · $${revenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
      </h2>
      ${orders.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Customer</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Package</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Amount</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;">${o.customerName || '—'}<br><span style="font-size:11px;color:#6b7280;font-weight:400;">${o.businessName || o.customerEmail}</span></td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${o.packageName}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:700;color:#166534;">$${(o.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">${ct(o.createdAt)}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p style="margin:0;font-size:13px;color:#6b7280;">No new orders in the last 24 hours.</p>'}
    </div>`

  // ── Inquiries section ─────────────────────────────────────────────────────
  const inquiriesSection = `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f5c518;">
        📧 Inquiries (24h) — ${inquiries.length}
      </h2>
      ${inquiries.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Name</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Package</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Contact</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${inquiries.map(i => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;">${i.name}<br><span style="font-size:11px;color:#6b7280;font-weight:400;">${i.businessName}</span></td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${i.service || '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;"><a href="mailto:${i.email}" style="color:#d97706;">${i.email}</a></td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">${ct(i.createdAt)}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p style="margin:0;font-size:13px;color:#6b7280;">No new inquiries in the last 24 hours.</p>'}
    </div>`

  // ── Payment failures ──────────────────────────────────────────────────────
  const failuresSection = failures.length ? `
    <div style="margin-bottom:32px;padding:16px 20px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;">
      <h2 style="font-size:15px;font-weight:700;color:#9a3412;margin:0 0 12px;">⚠️ Payment Failures (${failures.length})</h2>
      ${failures.map(f => `
        <div style="font-size:13px;margin-bottom:8px;">
          <strong>${f.customerEmail || 'Unknown'}</strong> — $${(f.amount || 0).toFixed(2)} —
          <span style="color:#dc2626;">${f.errorMessage}</span>
          <span style="color:#9ca3af;font-size:11px;margin-left:8px;">${ct(f.createdAt)}</span>
        </div>`).join('')}
    </div>` : ''

  // ── Analytics ─────────────────────────────────────────────────────────────
  const analyticsSection = `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f5c518;">
        📊 Checkout Funnel (24h)
      </h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          ${[
            { label: 'Pricing Views',     val: analytics.pricingViewed, color: '#f5c518' },
            { label: 'Checkout Clicks',   val: analytics.initiated,     color: '#f5c518' },
            { label: 'Abandoned',         val: analytics.abandoned,     color: '#f97316' },
            { label: 'Paid',              val: analytics.paid,          color: '#16a34a' },
          ].map(s => `
            <td style="text-align:center;padding:16px 8px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:6px;margin:4px;">
              <div style="font-size:28px;font-weight:800;color:${s.color};">${s.val}</div>
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">${s.label}</div>
            </td>`).join('')}
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Conversion rate (clicked → paid): <strong style="color:#111827;">${analytics.convRate}</strong></p>
    </div>`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:ui-sans-serif,system-ui,sans-serif;">
      <div style="max-width:680px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

        <!-- Header -->
        <div style="background:#0f0f11;padding:28px 36px 24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <p style="margin:0 0 4px;font-size:11px;font-family:monospace;letter-spacing:2px;text-transform:uppercase;color:#f5c518;">ILYTAT LLC — Internal</p>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#f0ece6;letter-spacing:-0.5px;">Nightly Report</h1>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;font-size:13px;color:#8e8ba0;">${date}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#8e8ba0;">Generated 2 AM CT</p>
            </div>
          </div>
          <!-- Status bar -->
          <div style="margin-top:20px;padding:10px 16px;border-radius:6px;background:${criticals.length ? '#7f1d1d' : errors.length ? '#7c2d12' : '#14532d'};display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;">${criticals.length ? '🚨' : errors.length ? '⚠️' : '✅'}</span>
            <span style="font-size:13px;font-weight:600;color:#fff;">${criticals.length ? `${criticals.length} critical alert${criticals.length > 1 ? 's' : ''} require attention` : errors.length ? `${errors.length} error${errors.length > 1 ? 's' : ''} logged` : 'All systems nominal — no issues detected'}</span>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:32px 36px;">
          ${alertSection}
          ${ordersSection}
          ${inquiriesSection}
          ${failuresSection}
          ${analyticsSection}
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:20px 36px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">ILYTAT LLC · Manteno, IL</p>
          <a href="https://ilytat.com/admin" style="font-size:12px;color:#d97706;font-weight:600;text-decoration:none;">Open Admin →</a>
        </div>

      </div>
    </body>
    </html>`

  return { subject, html }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  if (!isAuthorised(event)) {
    throw createError({ statusCode: 401, message: 'Unauthorised' })
  }

  const config = useRuntimeConfig()

  if (!config.resendApiKey || !config.notificationEmail) {
    throw createError({ statusCode: 500, message: 'RESEND_API_KEY or NOTIFICATION_EMAIL not configured' })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const dateLabel = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  // ── Fetch data in parallel ────────────────────────────────────────────────
  const [rawLogs, rawOrders, rawInquiries, rawFailures, analyticsRes] = await Promise.allSettled([
    firestoreRunQuery({ collectionId: 'logs',             whereField: 'createdAt', whereOp: 'GREATER_THAN_OR_EQUAL', whereValue: since, orderByField: 'createdAt', orderByDir: 'DESCENDING', limit: 500 }),
    firestoreRunQuery({ collectionId: 'orders',           whereField: 'createdAt', whereOp: 'GREATER_THAN_OR_EQUAL', whereValue: since, orderByField: 'createdAt', orderByDir: 'DESCENDING', limit: 100 }),
    firestoreRunQuery({ collectionId: 'inquiries',        whereField: 'createdAt', whereOp: 'GREATER_THAN_OR_EQUAL', whereValue: since, orderByField: 'createdAt', orderByDir: 'DESCENDING', limit: 100 }),
    firestoreRunQuery({ collectionId: 'payment_failures', whereField: 'createdAt', whereOp: 'GREATER_THAN_OR_EQUAL', whereValue: since, orderByField: 'createdAt', orderByDir: 'DESCENDING', limit: 100 }),
    firestoreRequest('GET', 'analytics_events?pageSize=300&orderBy=createdAt%20desc'),
  ])

  // ── Process logs (sorted by priority asc, then time desc) ─────────────────
  const logs: LogEntry[] = rawLogs.status === 'fulfilled'
    ? (rawLogs.value as LogEntry[]).sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3))
    : []

  const orders: Order[]             = rawOrders.status    === 'fulfilled' ? rawOrders.value    as Order[]            : []
  const inquiries: Inquiry[]        = rawInquiries.status === 'fulfilled' ? rawInquiries.value as Inquiry[]          : []
  const failures: PaymentFailure[]  = rawFailures.status  === 'fulfilled' ? rawFailures.value  as PaymentFailure[]   : []

  // ── Analytics: compute 24h funnel ─────────────────────────────────────────
  const analytics = { pricingViewed: 0, initiated: 0, abandoned: 0, paid: 0, convRate: '—' }
  if (analyticsRes.status === 'fulfilled') {
    const docs: Array<{ fields: Record<string, unknown> }> = analyticsRes.value.documents || []
    for (const doc of docs) {
      const e = doc.fields as unknown as { event: { stringValue: string }; createdAt: { stringValue: string } }
      const evtName  = e.event?.stringValue ?? ''
      const evtTime  = e.createdAt?.stringValue ?? ''
      if (evtTime < since) continue
      if (evtName === 'pricing_viewed')     analytics.pricingViewed++
      if (evtName === 'checkout_initiated') analytics.initiated++
      if (evtName === 'checkout_abandoned') analytics.abandoned++
      if (evtName === 'checkout_success')   analytics.paid++
    }
    analytics.convRate = analytics.initiated > 0
      ? `${Math.round((analytics.paid / analytics.initiated) * 100)}%`
      : '—'
  }

  // ── Build & send ──────────────────────────────────────────────────────────
  const { subject, html } = buildEmail({ date: dateLabel, logs, orders, inquiries, failures, analytics })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    (config.resendInvoiceFrom as string) || config.resendFrom,
      to:      [config.notificationEmail],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    await log('error', 'cron', 'Nightly report email failed to send', { status: res.status, detail })
    throw createError({ statusCode: 500, message: `Resend error: ${detail}` })
  }

  await log('info', 'cron', 'Nightly report sent', {
    logs:      logs.length,
    orders:    orders.length,
    inquiries: inquiries.length,
    failures:  failures.length,
  })

  return { ok: true, sent: true, counts: { logs: logs.length, orders: orders.length, inquiries: inquiries.length, failures: failures.length } }
})
