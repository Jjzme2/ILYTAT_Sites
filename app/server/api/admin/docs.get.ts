/**
 * GET /api/admin/docs
 *
 * Lists HTML documents stored under the `docs/` prefix in the R2 internal bucket.
 * Called from the admin "Docs" tab. Not publicly linked.
 */

import { listR2Docs } from '~/server/utils/r2'

export default defineEventHandler(async () => {
  return await listR2Docs()
})
