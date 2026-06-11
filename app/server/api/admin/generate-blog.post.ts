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

  const config = useRuntimeConfig()
  if (!config.geminiApiKey) {
    throw createError({ statusCode: 503, message: 'GEMINI_API_KEY is not configured on this server.' })
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
      apiKey: config.geminiApiKey as string,
    })

    await log('info', 'api', `Admin triggered AI blog: "${result.title}" → ${result.id} (${status})`)

    return { success: true, id: result.id, title: result.title, slug: result.slug, status }
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('error', 'api', `Admin AI blog generation failed: ${msg}`)
    throw createError({ statusCode: 500, message: `Generation failed: ${msg}` })
  }
})
