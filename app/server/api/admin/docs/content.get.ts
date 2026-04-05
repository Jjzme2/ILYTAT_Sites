/**
 * GET /api/admin/docs/content?key=docs/pricing-v3.html
 *
 * Fetches a single HTML document from the R2 internal bucket and returns its content.
 * The `key` must start with `docs/` — enforced in getR2Doc().
 */

import { getR2Doc } from '~/server/utils/r2'
import { requireAdmin } from '~/server/utils/verifyAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { key } = getQuery(event)
  if (!key || typeof key !== 'string') {
    throw createError({ statusCode: 400, message: '`key` query param is required' })
  }
  const html = await getR2Doc(key)
  return { html }
})
