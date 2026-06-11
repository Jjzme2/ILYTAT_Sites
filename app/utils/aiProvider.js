// ─── Config ───────────────────────────────────────────────────────────────────
// Server-side only — this module uses process.env directly.
// Never call generateQuote() from component code; use /api/get-quote instead.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

const providers = {
  gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    key: process.env.GEMINI_API_KEY,
  },
  opencloud: {
    url: (process.env.OPENCLOUD_BASE_URL ?? '') + '/v1/chat/completions',
    key: process.env.OPENCLOUD_API_KEY,
    // Required by all OpenAI-compatible APIs — set OPENCLOUD_MODEL in your env
    model: process.env.OPENCLOUD_MODEL ?? 'gpt-4o-mini',
  },
}

const SYSTEM_PROMPT = 'You are a quote assistant for ILYTAT LLC, a web design company in Manteno, IL. We have 3 tiers: Starter ($499), Pro ($999), Premium ($1,499). All are one-time builds. We also offer $89/month managed hosting. Respond ONLY in JSON: { "tier": "Starter|Pro|Premium", "price": "$499|$999|$1,499", "summary": "2-sentence plain-english summary of what they get", "addHosting": true|false, "nextStep": "one clear CTA sentence" }'

function formatAnswers(answers) {
  return Object.entries(answers)
    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
    .join('\n')
}

async function callGemini(userMessage) {
  const res = await fetch(`${providers.gemini.url}?key=${providers.gemini.key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned empty response')
  return text
}

async function callOpenCloud(userMessage) {
  const res = await fetch(providers.opencloud.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providers.opencloud.key}`,
      // OpenRouter requires HTTP-Referer to identify the calling app
      'HTTP-Referer': 'https://ilytat.com',
      'X-Title': 'ILYTAT LLC',
    },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model: providers.opencloud.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`OpenCloud ${res.status}`)
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenCloud returned empty response')
  return text
}

/**
 * Generate a quote recommendation from the wizard answers.
 * Tries Gemini first; falls back to OpenCloud silently on any error or timeout.
 *
 * @param {Record<string, string | string[]>} answers
 * @returns {Promise<string>} Raw JSON string from the AI
 */
export async function generateQuote(answers) {
  const userMessage = `Here are the answers:\n${formatAnswers(answers)}`

  if (providers.gemini.key) {
    try {
      return await callGemini(userMessage)
    }
    catch (e) {
      console.warn('[aiProvider] Gemini failed, trying OpenCloud:', e.message)
    }
  }

  if (providers.opencloud.key && process.env.OPENCLOUD_BASE_URL) {
    return await callOpenCloud(userMessage)
  }

  throw new Error('No AI provider configured or available. Please try again.')
}
