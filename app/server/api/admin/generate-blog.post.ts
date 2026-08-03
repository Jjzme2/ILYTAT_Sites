/**
 * POST /api/admin/generate-blog
 * Admin: immediately generate an AI blog post with a given focal point.
 * The post is saved as a draft by default (pass status:'published' to publish directly).
 *
 * Body: { focalPoint: string, additionalNotes?: string, status?: 'draft'|'published' }
 */
import { requireAdmin }      from '~/server/utils/verifyAdmin'
import { createAiBlogPost }  from '~/server/utils/generateBlog'
import { log }               from '~/server/utils/logger'
import { notifyAdmin }       from '~/server/utils/notify'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const cfg = useRuntimeConfig(event)
  if (!cfg.openrouterApiKey && !cfg.opencloudApiKey && !cfg.geminiApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No AI provider configured. Set OPENROUTER_API_KEY in the environment.',
    })
  }

  const body = await readBody(event)

  const focalPoint = String(body.focalPoint ?? '').trim()
  if (!focalPoint) {
    throw createError({ statusCode: 400, message: 'focalPoint is required' })
  }

  const status = body.status === 'published' ? 'published' : 'draft'

  try {
    const result = await createAiBlogPost({
      focalPoint,
      additionalNotes: String(body.additionalNotes ?? '').trim(),
      status,
    })

    await log('info', 'api', `Admin triggered AI blog: "${result.title}" → ${result.id} (${status})`)

    // Fire-and-forget: a notification must never fail the generation it reports.
    void notifyAdmin({
      level: 'success',
      subject: `Blog ${status}: ${result.title}`,
      title: result.title,
      lines: [
        `A post was generated and saved as ${status}.`,
        result.nextFocalPoint
          ? `Next week's plan has rolled forward to: "${result.nextFocalPoint}"`
          : 'No follow-up topic was suggested — set next week\'s plan manually.',
      ],
      action: {
        label: status === 'published' ? 'View post' : 'Review draft',
        url: status === 'published'
          ? `${cfg.public.siteUrl}/blog/${result.slug}`
          : `${cfg.public.siteUrl}/admin`,
      },
    })

    return {
      success: true,
      id: result.id,
      title: result.title,
      slug: result.slug,
      status,
      // Suggested topic for next week, produced by the same call that wrote
      // this post — no extra request, no extra spend.
      nextFocalPoint: result.nextFocalPoint ?? null,
      nextFocalPointWhy: result.nextFocalPointWhy ?? null,
    }
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('error', 'api', `Admin AI blog generation failed: ${msg}`)

    void notifyAdmin({
      level: 'error',
      subject: 'Blog generation failed',
      title: 'A blog post could not be generated',
      lines: [
        `Focal point: "${focalPoint}"`,
        'The provider error is below. Billing and quota problems are the usual cause.',
      ],
      detail: msg,
      action: { label: 'Open admin', url: `${cfg.public.siteUrl}/admin` },
    })
    // statusMessage (not message) is what reaches the client, so the admin UI
    // can show why it failed instead of a bare 500.
    throw createError({ statusCode: 502, statusMessage: `Generation failed — ${msg}` })
  }
})
