import { z } from 'zod'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  businessName: z.string().min(1),
  phone: z.string().optional(),
  service: z.string(),
  message: z.string().min(10).max(2000),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = schema.parse(body)

  const inquiry = {
    ...data,
    status: 'new',
    createdAt: new Date().toISOString(),
  }

  await firestoreRequest('POST', 'inquiries', {
    fields: toFirestoreFields(inquiry),
  })

  return { success: true }
})
