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
    // statusMessage (not message) is what reaches the client, so the admin UI
    // can show why it failed instead of a bare 500.
    throw createError({ statusCode: 502, statusMessage: `Generation failed — ${msg}` })
  }
})
