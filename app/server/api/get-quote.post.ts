/**
 * POST /api/get-quote
 *
 * Public endpoint for the homepage estimator. It calls a paid model, so it
 * carries the same guards as the other public AI tools — it previously had
 * none at all, which made it a free API for anyone who found it.
 */
import { generateQuote, normalizeQuote } from '~/server/utils/quote'
import { parseAiJson } from '~/server/utils/ai'
import { clientIp, rateLimit, dailyBudget } from '~/server/utils/guard'

export default defineEventHandler(async (event) => {
  const { answers } = await readBody(event)

  if (!answers || typeof answers !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Missing answers payload.' })
  }

  // Custom software / app — skip AI and return a tailored contact CTA immediately.
  if (answers.serviceType === 'Custom Software / App') {
    return {
      tier:       'Custom Software',
      price:      'Custom',
      summary:    'Custom software projects are scoped individually — complexity, integrations, and timeline all vary. We\'ll put together a detailed proposal after a short conversation about what you\'re building.',
      addHosting: false,
      nextStep:   'Use the contact form below to describe your project. JJ will follow up within 1 business day to schedule a scoping call.',
      message:    'Custom builds are what we love most. Tell us what you\'re trying to solve and we\'ll figure out the best approach together — no pressure, no generic proposals.',
      rationale:  [
        'Off-the-shelf website packages don\'t apply — custom software requires individual scoping',
        'Pricing depends on features, integrations, and estimated development hours',
        'A short scoping call lets us give you an accurate quote with no surprises',
      ],
    }
  }

  const cfg = useRuntimeConfig(event)
  rateLimit({
    scope: 'get-quote',
    ip: clientIp(event),
    max: 8,
    windowMs: 10 * 60 * 1000,
    message: 'That is a lot of quotes. Give it a few minutes, or just send a message below.',
  })
  dailyBudget(cfg.aiDailyRequestCap)

  let raw: string
  try {
    raw = await generateQuote(answers, event)
  }
  catch (e: unknown) {
    // Log the provider detail; never return it to a public caller.
    console.error('[get-quote] AI call failed:', e instanceof Error ? e.message : String(e))
    throw createError({
      statusCode: 502,
      statusMessage: 'The estimator is unavailable right now. Send a message below and JJ will quote it directly.',
    })
  }

  try {
    // normalizeQuote forces the tier and price back onto the real price list —
    // this quotes actual money, so a hallucinated figure would be worse than
    // a failed request.
    return await normalizeQuote(parseAiJson(raw))
  }
  catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not read the estimate. Try again, or send a message below.',
    })
  }
})
