/**
 * GET /api/cron/weekly-blog
 *
 * Scheduled via vercel.json — runs every Monday at 10 AM CT (15:00 UTC).
 * Can also be triggered manually:
 *   curl -H "x-cron-secret: <CRON_SECRET>" https://ilytat.com/api/cron/weekly-blog
 *
 * Reads the saved blog plan from adminConfig/blog-plan.
 * Falls back to a rotating default topic if no plan was saved.
 * Generates a draft blog post via Gemini, persists it, clears the plan,
 * and sends a notification email.
 */

import { createAiBlogPost }                        from '~/server/utils/generateBlog'
import { firestoreRequest, fromFirestoreFields, toFirestoreFields } from '~/server/utils/firebaseAdmin'
import { log }                                     from '~/server/utils/logger'

// ── Default fallback topics (rotates by week-of-year) ────────────────────────

const DEFAULT_TOPICS = [
  'Why every local business in Kankakee County needs a professional website in 2025',
  'How to tell if your current website is hurting your business',
  'What to look for when hiring a web designer for your small business',
  'The real cost of a "free" website builder for your local business',
  'How fast-loading websites win more customers for local service businesses',
  'Why your Google Business Profile and website need to work together',
  'What questions to ask before signing a web design contract',
  'How a blog can drive new customers to your local business',
  'Mobile-first websites: why it matters more than ever for local businesses',
  'The difference between a website template and a custom-built site',
  'How ILYTAT helped a Kankakee County business grow their online presence',
  'Common website mistakes local businesses make — and how to fix them',
]

function defaultTopic(): string {
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return DEFAULT_TOPICS[week % DEFAULT_TOPICS.length]!
}

// ── Auth guard ────────────────────────────────────────────────────────────────

function isAuthorised(event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never): boolean {
  const config = useRuntimeConfig()
  const secret = config.cronSecret as string
  if (!secret) return false
  const vercelCron = getHeader(event, 'x-vercel-cron')
  const provided   = getHeader(event, 'x-cron-secret')
  return vercelCron === '1' || provided === secret
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  if (!isAuthorised(event)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const config = useRuntimeConfig()

  if (!config.geminiApiKey) {
    await log('warn', 'cron', 'weekly-blog skipped: GEMINI_API_KEY not set')
    return { skipped: true, reason: 'GEMINI_API_KEY not configured' }
  }

  // ── Read saved plan ─────────────────────────────────────────────────────────
  let focalPoint      = defaultTopic()
  let additionalNotes = ''

  try {
    const planDoc = await firestoreRequest('GET', 'adminConfig/blog-plan')
    const plan    = fromFirestoreFields(planDoc.fields || {})
    if (plan.focalPoint && String(plan.focalPoint).trim()) {
      focalPoint      = String(plan.focalPoint).trim()
      additionalNotes = String(plan.additionalNotes ?? '').trim()
    }
  }
  catch {
    // No plan saved yet — use the default topic
  }

  // ── Generate & save ─────────────────────────────────────────────────────────
  let result: { id: string; title: string; slug: string }

  try {
    result = await createAiBlogPost({
      focalPoint,
      additionalNotes,
      status: 'draft',
      apiKey: config.geminiApiKey as string,
    })
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('error', 'cron', `weekly-blog generation failed: ${msg}`)
    throw createError({ statusCode: 500, message: msg })
  }

  // ── Clear the plan so next week starts fresh ────────────────────────────────
  const now = new Date().toISOString()
  firestoreRequest('PATCH', 'adminConfig/blog-plan', {
    fields: toFirestoreFields({ focalPoint: '', additionalNotes: '', weekOf: '', updatedAt: now }),
  }).catch(() => { /* non-fatal */ })

  // ── Email notification ──────────────────────────────────────────────────────
  const resendKey   = config.resendApiKey    as string
  const notifyEmail = config.notificationEmail as string
  const siteUrl     = config.public.siteUrl  as string

  if (resendKey && notifyEmail) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from:    config.resendFrom as string,
        to:      [notifyEmail],
        subject: `New AI draft ready: "${result.title}"`,
        html: `
          <p>Your weekly AI blog post has been saved as a <strong>draft</strong>.</p>
          <h2 style="margin:12px 0 4px">${result.title}</h2>
          <p style="color:#888">Slug: /blog/${result.slug}</p>
          <p>
            <a href="${siteUrl}/admin" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">
              Review &amp; publish →
            </a>
          </p>
          <hr style="margin:24px 0;border-color:#eee">
          <p style="color:#aaa;font-size:12px">
            Focal point used: "${focalPoint}"<br>
            Generated by Aria — ILYTAT AI
          </p>
        `.trim(),
      }),
    }).catch(() => { /* non-fatal */ })
  }

  await log('info', 'cron', `weekly-blog generated: "${result.title}" (${result.id})`)

  return { success: true, id: result.id, title: result.title, slug: result.slug }
})
