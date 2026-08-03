/**
 * GET /api/cron/nightly-report
 *
 * Scheduled via vercel.json — runs nightly at 2 AM CT.
 * Can also be triggered manually with:
 *   curl -H "x-cron-secret: <CRON_SECRET>" https://sites.ilytat.com/api/cron/nightly-report
 *
 * Pulls the last 24 hours of:
 *   - App logs (from the `logs` collection, prioritised critical → info)
 *   - New orders, inquiries, payment failures
 *   - Analytics funnel
 *
 * Sends a single HTML digest to NOTIFICATION_EMAIL via Resend.
 */

import {
  firestoreRunQuery,
  firestoreRequest,
  fromFirestoreFields,
  toFirestoreFields,
} from "~/server/utils/firebaseAdmin";
import { log } from "~/server/utils/logger";
import { notifyAdmin } from "~/server/utils/notify";
import { pruneCollection } from "~/server/utils/retention";
import { getPricing, tierLabels } from "~/server/utils/stripePricing";

// ── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  level: string;
  area: string;
  message: string;
  data: string | null;
  priority: number;
  createdAt: string;
}

interface Order {
  id: string;
  packageName: string;
  customerName: string;
  customerEmail: string;
  businessName: string;
  amount: number;
  createdAt: string;
}

interface Inquiry {
  id: string;
  name: string;
  businessName: string;
  email: string;
  service: string;
  createdAt: string;
}

interface AnalyticsEvent {
  event?: string;
  createdAt?: string;
  props?: string;
  path?: string;
  sessionId?: string;
  referrer?: string;
}

interface DailyStats {
  pageViews: number;
  visitors: number;
  pricingViewed: number;
  contactSubmits: number;
  toolRuns: number;
  topPage: string;
  topReferrer: string;
}

// ── Auth guard ────────────────────────────────────────────────────────────────

function isAuthorised(
  event: ReturnType<typeof defineEventHandler> extends (...args: infer A) => unknown ? A[0] : never,
): boolean {
  const config = useRuntimeConfig();
  const secret = config.cronSecret as string;
  if (!secret) return false;
  // Vercel sets x-vercel-cron on legitimate scheduled calls
  const vercelCron = getHeader(event, "x-vercel-cron");
  const provided = getHeader(event, "x-cron-secret");
  return vercelCron === "1" || provided === secret;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ct(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function badge(level: string): string {
  const map: Record<string, string> = {
    critical: "background:#dc2626;color:#fff;",
    error: "background:#ea580c;color:#fff;",
    warn: "background:#d97706;color:#fff;",
    info: "background:#6b7280;color:#fff;",
  };
  return `<span style="font-size:10px;font-weight:700;letter-spacing:1px;padding:2px 7px;border-radius:3px;text-transform:uppercase;${map[level] ?? map.info}">${level}</span>`;
}

function areaTag(area: string): string {
  return `<span style="font-size:11px;color:#6b7280;font-family:monospace;">[${area}]</span>`;
}

// ── Email builder ─────────────────────────────────────────────────────────────

function buildEmail(opts: {
  date: string;
  logs: LogEntry[];
  orders: Order[];
  inquiries: Inquiry[];
  analytics: DailyStats;
}): { subject: string; html: string } {
  const { date, logs, orders, inquiries, analytics } = opts;

  const criticals = logs.filter((l) => l.level === "critical");
  const errors = logs.filter((l) => l.level === "error");
  const warnings = logs.filter((l) => l.level === "warn");
  const revenue = orders.reduce((s, o) => s + (o.amount || 0), 0);

  // Subject line
  const alertSummary = criticals.length
    ? `🚨 ${criticals.length} critical`
    : errors.length
      ? `⚠️ ${errors.length} error${errors.length > 1 ? "s" : ""}`
      : "✅ All clear";
  const subject = `ILYTAT Nightly Report — ${date} · ${alertSummary}`;

  // ── Alert rows ────────────────────────────────────────────────────────────
  function logRows(entries: LogEntry[]): string {
    if (!entries.length) return "";
    return entries
      .map(
        (e) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;white-space:nowrap;font-size:12px;color:#9ca3af;">${ct(e.createdAt)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;">${badge(e.level)} ${areaTag(e.area)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;font-size:13px;color:#111827;">${e.message}${e.data ? `<br><span style="font-size:11px;color:#9ca3af;font-family:monospace;">${e.data}</span>` : ""}</td>
      </tr>`,
      )
      .join("");
  }

  const alertSection =
    criticals.length || errors.length || warnings.length
      ? `
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
    </div>`
      : `
    <div style="margin-bottom:32px;padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">✅ No warnings or errors in the last 24 hours.</p>
    </div>`;

  // ── Orders section ────────────────────────────────────────────────────────
  const ordersSection = `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f5c518;">
        💰 Revenue (24h) — ${orders.length} order${orders.length !== 1 ? "s" : ""} · $${revenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
      </h2>
      ${
        orders.length
          ? `
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
            ${orders
              .map(
                (o) => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;">${o.customerName || "—"}<br><span style="font-size:11px;color:#6b7280;font-weight:400;">${o.businessName || o.customerEmail}</span></td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${o.packageName}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:700;color:#166534;">$${(o.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">${ct(o.createdAt)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
          : '<p style="margin:0;font-size:13px;color:#6b7280;">No new orders in the last 24 hours.</p>'
      }
    </div>`;

  // ── Inquiries section ─────────────────────────────────────────────────────
  const inquiriesSection = `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f5c518;">
        📧 Inquiries (24h) — ${inquiries.length}
      </h2>
      ${
        inquiries.length
          ? `
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
            ${inquiries
              .map(
                (i) => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:600;">${i.name}<br><span style="font-size:11px;color:#6b7280;font-weight:400;">${i.businessName}</span></td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${i.service || "—"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;"><a href="mailto:${i.email}" style="color:#d97706;">${i.email}</a></td>
                <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">${ct(i.createdAt)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
          : '<p style="margin:0;font-size:13px;color:#6b7280;">No new inquiries in the last 24 hours.</p>'
      }
    </div>`;

  // ── Analytics ─────────────────────────────────────────────────────────────
  // Page views and unique visitors are the denominator: two pricing views is a
  // different story at 10 visitors than at 400, and the old report showed only
  // the numerator.
  const analyticsSection = `
    <div style="margin-bottom:32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #f5c518;">
        📊 Site Activity (24h)
      </h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          ${[
            { label: "Page Views", val: analytics.pageViews, color: "#111827" },
            { label: "Visitors", val: analytics.visitors, color: "#111827" },
            { label: "Pricing Views", val: analytics.pricingViewed, color: "#d97706" },
            { label: "Tool Runs", val: analytics.toolRuns, color: "#d97706" },
            { label: "Contact Submits", val: analytics.contactSubmits, color: "#16a34a" },
          ]
            .map(
              (s) => `
            <td style="text-align:center;padding:16px 6px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:6px;">
              <div style="font-size:24px;font-weight:800;color:${s.color};">${s.val}</div>
              <div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">${s.label}</div>
            </td>`,
            )
            .join("")}
        </tr>
      </table>
      ${
        analytics.topPage || analytics.topReferrer
          ? `<p style="margin:12px 0 0;font-size:12px;color:#6b7280;">
               ${analytics.topPage ? `Most-viewed page: <strong style="color:#111827;font-family:monospace;">${analytics.topPage}</strong>` : ""}
               ${analytics.topPage && analytics.topReferrer ? " · " : ""}
               ${analytics.topReferrer ? `Top source: <strong style="color:#111827;">${analytics.topReferrer}</strong>` : ""}
             </p>`
          : '<p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">No page views recorded in the last 24 hours.</p>'
      }
    </div>`;

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
          <div style="margin-top:20px;padding:10px 16px;border-radius:6px;background:${criticals.length ? "#7f1d1d" : errors.length ? "#7c2d12" : "#14532d"};display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;">${criticals.length ? "🚨" : errors.length ? "⚠️" : "✅"}</span>
            <span style="font-size:13px;font-weight:600;color:#fff;">${criticals.length ? `${criticals.length} critical alert${criticals.length > 1 ? "s" : ""} require attention` : errors.length ? `${errors.length} error${errors.length > 1 ? "s" : ""} logged` : "All systems nominal — no issues detected"}</span>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:32px 36px;">
          ${alertSection}
          ${ordersSection}
          ${inquiriesSection}
          ${analyticsSection}
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:20px 36px;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">ILYTAT LLC · Manteno, IL</p>
          <a href="https://sites.ilytat.com/admin" style="font-size:12px;color:#d97706;font-weight:600;text-decoration:none;">Open Admin →</a>
        </div>

      </div>
    </body>
    </html>`;

  return { subject, html };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  if (!isAuthorised(event)) {
    throw createError({ statusCode: 401, message: "Unauthorised" });
  }

  const config = useRuntimeConfig();

  if (!config.resendApiKey || !config.notificationEmail) {
    throw createError({
      statusCode: 500,
      message: "RESEND_API_KEY or NOTIFICATION_EMAIL not configured",
    });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateLabel = new Date().toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // ── Fetch data in parallel ────────────────────────────────────────────────
  const [rawLogs, rawOrders, rawInquiries, analyticsRes] = await Promise.allSettled([
    firestoreRunQuery({
      collectionId: "logs",
      whereField: "createdAt",
      whereOp: "GREATER_THAN_OR_EQUAL",
      whereValue: since,
      orderByField: "createdAt",
      orderByDir: "DESCENDING",
      limit: 500,
    }),
    firestoreRunQuery({
      collectionId: "orders",
      whereField: "createdAt",
      whereOp: "GREATER_THAN_OR_EQUAL",
      whereValue: since,
      orderByField: "createdAt",
      orderByDir: "DESCENDING",
      limit: 100,
    }),
    firestoreRunQuery({
      collectionId: "inquiries",
      whereField: "createdAt",
      whereOp: "GREATER_THAN_OR_EQUAL",
      whereValue: since,
      orderByField: "createdAt",
      orderByDir: "DESCENDING",
      limit: 100,
    }),
    // Windowed query rather than the previous "300 most recent, then filter in
    // memory" read: once page views are recorded, 300 documents is well under
    // a day of traffic, so the counts below would have been silently capped.
    firestoreRunQuery({
      collectionId: "analytics_events",
      whereField: "createdAt",
      whereOp: "GREATER_THAN_OR_EQUAL",
      whereValue: since,
      orderByField: "createdAt",
      orderByDir: "DESCENDING",
      limit: 3000,
    }),
  ]);

  // ── Process logs (sorted by priority asc, then time desc) ─────────────────
  const logs: LogEntry[] =
    rawLogs.status === "fulfilled"
      ? (rawLogs.value as LogEntry[]).sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3))
      : [];

  const orders: Order[] = rawOrders.status === "fulfilled" ? (rawOrders.value as Order[]) : [];
  const inquiries: Inquiry[] =
    rawInquiries.status === "fulfilled" ? (rawInquiries.value as Inquiry[]) : [];

  // ── Analytics: compute 24h counts ────────────────────────────────────────
  const analytics: DailyStats = {
    pageViews: 0,
    visitors: 0,
    pricingViewed: 0,
    contactSubmits: 0,
    toolRuns: 0,
    topPage: "",
    topReferrer: "",
  };

  if (analyticsRes.status === "fulfilled") {
    const events = analyticsRes.value as AnalyticsEvent[];
    const sessions = new Set<string>();
    const pages: Record<string, number> = {};
    const referrers: Record<string, number> = {};

    for (const e of events) {
      const name = e.event ?? "";
      if (e.sessionId) sessions.add(e.sessionId);
      if (name === "pricing_viewed") analytics.pricingViewed++;
      if (name === "contact_submit") analytics.contactSubmits++;
      if (name === "tool_use" || name === "audit_run") analytics.toolRuns++;
      if (name === "page_view") {
        analytics.pageViews++;
        if (e.path) pages[e.path] = (pages[e.path] || 0) + 1;
        const src = e.referrer || "(direct)";
        referrers[src] = (referrers[src] || 0) + 1;
      }
    }

    analytics.visitors = sessions.size;
    analytics.topPage = Object.entries(pages).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    analytics.topReferrer = Object.entries(referrers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }

  // ── Build & send ──────────────────────────────────────────────────────────
  const { subject, html } = buildEmail({ date: dateLabel, logs, orders, inquiries, analytics });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: (config.resendInvoiceFrom as string) || config.resendFrom,
      to: [config.notificationEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    await log("error", "cron", "Nightly report email failed to send", {
      status: res.status,
      detail,
    });
    throw createError({ statusCode: 500, message: `Resend error: ${detail}` });
  }

  await log("info", "cron", "Nightly report sent", {
    logs: logs.length,
    orders: orders.length,
    inquiries: inquiries.length,
    pageViews: analytics.pageViews,
    visitors: analytics.visitors,
  });

  // ── Weekly blog watchdog ──────────────────────────────────────────────────
  // A job that never runs cannot report that it never ran. When the weekly
  // blog cron silently skipped a week, the only signal was noticing the missing
  // post days later — every alert in that job is code that only executes once
  // the job has already started.
  //
  // So a different job checks for the absence. This one runs daily, and simply
  // asks whether a post has appeared recently enough. It catches the whole
  // class at once: a bad provider check, a Vercel scheduling change, a plan
  // limit, a broken deploy, an expired cron secret.
  try {
    const recentPosts = await firestoreRunQuery({
      collectionId: "blog_posts",
      whereField: "createdAt",
      whereOp: "GREATER_THAN_OR_EQUAL",
      // Nine days, not seven: the job runs weekly, so a strict seven-day window
      // would false-alarm every time it ran a few hours later than the previous
      // week. Nine gives a two-day grace period and still catches a real miss
      // on the next nightly run.
      whereValue: new Date(Date.now() - 9 * 86_400_000).toISOString(),
      orderByField: "createdAt",
      orderByDir: "DESCENDING",
      limit: 5,
    });

    if (!recentPosts.length) {
      // `error` rather than `critical` — the explicit email below is the alert,
      // and critical would send a second, vaguer one alongside it.
      await log("error", "cron", "No blog post created in the last 9 days");
      await notifyAdmin({
        level: "error",
        subject: "The weekly blog has stopped running",
        title: "No post has been created in over a week",
        lines: [
          "The weekly job should produce a draft every Monday, and nothing has appeared in nine days.",
          "That usually means the job is not being triggered at all, rather than failing — a failure would have emailed you separately.",
          "Check Vercel → the project → Cron Jobs to see whether the last run fired, then trigger it by hand to catch up.",
        ],
        action: { label: "Open admin", url: "https://sites.ilytat.com/admin" },
      });
    }
  }
  catch (err) {
    await log("warn", "cron", "Blog watchdog check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Stripe price drift ────────────────────────────────────────────────────
  // The site now follows Stripe automatically, which is the point — but a price
  // that changes on its own with nobody told is its own hazard. This reports
  // any move since the last run, and shouts if a tier is stuck on the committed
  // fallback (meaning the page and Stripe have silently diverged again).
  try {
    const pricing = await getPricing(true)
    const labels = tierLabels()
    const keys = Object.keys(labels) as Array<keyof typeof labels>

    const current: Record<string, number> = {}
    for (const k of keys) current[k] = pricing[k].amount

    let previous: Record<string, number> = {}
    try {
      const doc = await firestoreRequest('GET', 'settings/pricingSnapshot')
      previous = JSON.parse(String(fromFirestoreFields(doc.fields || {}).amounts || '{}'))
    }
    catch { /* first run, or the document does not exist yet */ }

    const moved = keys
      .filter(k => previous[k] != null && previous[k] !== current[k])
      .map(k => `${labels[k]}: $${previous[k]} → $${current[k]}`)

    const stuck = keys
      .filter(k => pricing[k].source === 'fallback' && pricing[k].reason)
      .map(k => `${labels[k]} — ${pricing[k].reason}`)

    if (moved.length || stuck.length) {
      await notifyAdmin({
        level: stuck.length ? 'error' : 'info',
        subject: stuck.length ? 'Stripe prices could not be read' : 'Site prices changed to match Stripe',
        title: stuck.length
          ? 'Some prices are not following Stripe'
          : 'The site picked up a price change from Stripe',
        lines: [
          ...(moved.length ? ['These prices changed on the site because they changed in Stripe:'] : []),
          ...moved,
          ...(stuck.length
            ? ['These tiers fell back to the price committed in the code, so the site and Stripe may not agree:']
            : []),
          ...stuck,
        ],
        action: { label: 'Open pricing', url: 'https://sites.ilytat.com/#pricing' },
      })
    }

    await firestoreRequest('PATCH', 'settings/pricingSnapshot', {
      fields: toFirestoreFields({ amounts: JSON.stringify(current), updatedAt: new Date().toISOString() }),
    })
  }
  catch (err) {
    await log('warn', 'cron', 'Stripe price check failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // ── Retention ─────────────────────────────────────────────────────────────
  // Runs after the email so pruning can never remove data the report needed,
  // and never throws — housekeeping must not be able to fail the digest.
  const pruned = await Promise.all([
    pruneCollection("logs", Number(config.logRetentionDays) || 45),
    pruneCollection("analytics_events", Number(config.analyticsRetentionDays) || 180),
  ]);

  for (const p of pruned) {
    if (p.error) {
      await log("warn", "cron", `Retention pass failed for ${p.collection}`, { error: p.error });
    }
    else if (p.deleted || p.failed) {
      await log("info", "cron", `Pruned ${p.collection}`, {
        deleted: p.deleted,
        failed: p.failed,
      });
    }
  }

  return {
    ok: true,
    sent: true,
    counts: { logs: logs.length, orders: orders.length, inquiries: inquiries.length },
    pruned,
  };
});
