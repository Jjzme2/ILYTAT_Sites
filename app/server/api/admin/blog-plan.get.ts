/**
 * GET /api/admin/blog-plan
 * Returns the saved plan (focal point + notes) for next week's AI blog.
 * Returns an empty plan object if none has been saved yet.
 */
import { requireAdmin } from '~/server/utils/verifyAdmin'
import { firestoreRequest, fromFirestoreFields } from '~/server/utils/firebaseAdmin'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  try {
    const res  = await firestoreRequest('GET', 'adminConfig/blog-plan')
    const plan = fromFirestoreFields(res.fields || {})
    return {
      focalPoint:      String(plan.focalPoint      ?? ''),
      additionalNotes: String(plan.additionalNotes ?? ''),
      weekOf:          String(plan.weekOf          ?? ''),
      updatedAt:       plan.updatedAt ? String(plan.updatedAt) : null,
    }
  }
  catch {
    return { focalPoint: '', additionalNotes: '', weekOf: '', updatedAt: null }
  }
})
