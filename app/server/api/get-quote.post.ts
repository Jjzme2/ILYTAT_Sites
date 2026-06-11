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
    return JSON.parse(raw)
  }
  catch {
    throw createError({ statusCode: 502, message: 'Invalid AI response format. Please try again.' })
  }
})
