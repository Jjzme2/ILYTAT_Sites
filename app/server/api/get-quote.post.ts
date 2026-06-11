import { generateQuote } from '~/utils/aiProvider'

export default defineEventHandler(async (event) => {
  const { answers } = await readBody(event)

  if (!answers || typeof answers !== 'object') {
    throw createError({ statusCode: 400, message: 'Missing answers payload.' })
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
