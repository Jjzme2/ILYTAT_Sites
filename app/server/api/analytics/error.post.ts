/**
 * POST /api/analytics/error
 *
 * Receives JavaScript errors from the browser.
 *
 * A server error at least lands in the Vercel log. A client error lands
 * nowhere: if the quote estimator throws on an iPhone, the visitor sees a dead
 * button, closes the tab, and no trace of it exists anywhere. For a site whose
 * entire job is turning visitors into inquiries, a silent client-side failure
 * is the most expensive kind of bug and was the only kind with no telemetry.
 *
 * This endpoint is public and therefore an obvious target for filling the logs
 * collection, so it is guarded harder than the payload deserves: a tight rate
 * limit, hard field caps, and no reflection of the input in the response.
 */

import { z } from 'zod'
import { clientIp, rateLimit } from '~/server/utils/guard'
import { log } from '~/server/utils/logger'

const schema = z.object({
  message: z.string().min(1).max(300),
  source: z.enum(['vue', 'window', 'promise']).default('window'),
  stack: z.string().max(1200).optional().default(''),
  path: z.string().max(300).optional().default(''),
  component: z.string().max(120).optional().default(''),
  ua: z.string().max(300).optional().default(''),
})

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)

  // A broken page can fire the same error on every render. The client throttles
  // too, but the client is the thing that is misbehaving, so it does not get to
  // be the only limit.
  rateLimit({ scope: 'client-error', ip, max: 10, windowMs: 60_000 })

  const parsed = schema.safeParse(await readBody(event))
  // A malformed report is itself a symptom, but not one worth a 400 round-trip
  // to a page that is already failing.
  if (!parsed.success) return { ok: true }

  const d = parsed.data

  await log('error', 'client', `Browser error: ${d.message}`, {
    source: d.source,
    path: d.path,
    component: d.component,
    stack: d.stack,
    ua: d.ua.slice(0, 200),
  }, {
    ip,
    path: d.path,
  })

  return { ok: true }
})
