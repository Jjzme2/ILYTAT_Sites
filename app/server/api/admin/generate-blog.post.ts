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

  if (!process.env.GEMINI_API_KEY && !(process.env.OPENCLOUD_API_KEY && process.env.OPENCLOUD_BASE_URL)) {
    throw createError({ statusCode: 503, message: 'No AI provider configured (GEMINI_API_KEY or OPENCLOUD_API_KEY + OPENCLOUD_BASE_URL required).' })
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

    return { success: true, id: result.id, title: result.title, slug: result.slug, status }
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await log('error', 'api', `Admin AI blog generation failed: ${msg}`)
    throw createError({ statusCode: 500, message: `Generation failed: ${msg}` })
  }
})
