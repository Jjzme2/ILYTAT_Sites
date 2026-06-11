/**
 * PUT /api/admin/blog-plan
 * Saves (or replaces) the plan for next week's AI blog post.
 * Uses PATCH on the singleton adminConfig/blog-plan document (creates if absent).
 */
import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody(event)
  const now  = new Date().toISOString()

  const plan = {
    focalPoint:      String(body.focalPoint      ?? '').trim(),
    additionalNotes: String(body.additionalNotes ?? '').trim(),
    weekOf:          String(body.weekOf          ?? '').trim(),
    updatedAt:       now,
  }

  await firestoreRequest('PATCH', 'adminConfig/blog-plan', {
    fields: toFirestoreFields(plan as Record<string, unknown>),
  })

  return plan
})
