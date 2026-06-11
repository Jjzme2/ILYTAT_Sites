import { generateQuote } from '~/utils/aiProvider'

export default defineEventHandler(async (event) => {
  const { answers } = await readBody(event)

  if (!answers || typeof answers !== 'object') {
    throw createError({ statusCode: 400, message: 'Missing answers payload.' })
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

  let raw: string
  try {
    raw = await generateQuote(answers)
  }
  catch (e: unknown) {
    throw createError({
      statusCode: 502,
      message: e instanceof Error ? e.message : 'AI provider unavailable. Please try again.',
    })
  }

  try {
    const result = JSON.parse(raw)
    // Guarantee the message field exists — some models omit optional JSON fields
    if (!result.message) {
      result.message = `Based on your answers, the ${result.tier} package looks like a great fit for what you're building.`
    }
    return result
  }
  catch {
    throw createError({ statusCode: 502, message: 'Invalid AI response format. Please try again.' })
  }
})
