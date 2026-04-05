/**
 * GET /api/admin/docs
 *
 * Lists HTML documents stored under the `docs/` prefix in the R2 internal bucket.
 * Called from the admin "Docs" tab. Not publicly linked.
 */

import { listR2Docs } from '~/server/utils/r2'
import { requireAdmin } from '~/server/utils/verifyAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return await listR2Docs()
})
