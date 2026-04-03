import { z } from 'zod'
import { firestoreRequest, toFirestoreFields } from '~/server/utils/firebaseAdmin'

const schema = z.object({
  event:      z.string().min(1).max(80),
  properties: z.record(z.unknown()).optional().default({}),
  sessionId:  z.string().max(64).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = schema.parse(body)

  // Best-effort — failure must not break the client
  try {
    await firestoreRequest('POST', 'analytics_events', {
      fields: toFirestoreFields({
        event:     data.event,
        props:     JSON.stringify(data.properties),
        sessionId: data.sessionId,
        referrer:  getHeader(event, 'referer') || '',
        ua:        getHeader(event, 'user-agent') || '',
        createdAt: new Date().toISOString(),
      }),
    })
  }
  catch { /* non-fatal */ }

  return { ok: true }
})
