/**
 * Single AI client for the whole app.
 *
 * generateBlog.ts and the public AI tools use this. utils/aiProvider.js (the
 * quote estimator) has NOT been migrated yet and still carries its own provider
 * list and env reads — it should move here too.
 *
 * Provider is OpenRouter (OpenAI-compatible). One key, one bill, and the model
 * is a config value rather than a URL path — so a model being retired is an env
 * change, not a deploy. Gemini stays as an optional fallback.
 *
 * Two things this fixes about the old code:
 *
 *   1. Errors were swallowed. `callAI` caught the real provider failure into a
 *      console.warn, then threw "No AI provider available. Configure
 *      GEMINI_API_KEY" — which was false whenever that key WAS set and the
 *      provider had failed for some other reason (retired model, bad key,
 *      quota). Every underlying error is now preserved and surfaced.
 *
 *   2. Config came from process.env read at module scope. It now comes from
 *      runtimeConfig, so values can change without a rebuild.
 */

export interface AiCallOptions {
  /** Instructions. Trusted — never interpolate user input into this. */
  system: string
  /** The user turn. Untrusted input must be wrapped with fenceUserInput(). */
  user: string
  /** Ask the provider for a JSON object back. */
  json?: boolean
  /** Hard ceiling on response length. Always set one for public endpoints. */
  maxTokens?: number
  temperature?: number
  /** Overrides the configured model. */
  model?: string
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AiError'
  }
}

/**
 * Wraps untrusted text so the model treats it as data, not instructions.
 *
 * Delimiters alone are not a security boundary — a determined injection can
 * still try to talk its way out. This is one layer: the system prompt states
 * the rule, the fence marks the boundary, and the caller is expected to sanity
 * check the output. Any backticks in the input are stripped so the fence
 * cannot be closed early.
 */
export function fenceUserInput(label: string, raw: string, maxChars = 4000): string {
  const cleaned = raw
    .slice(0, maxChars)
    // Neutralise code fences and our own delimiter so the fence cannot be
    // closed early, and strip control characters used to smuggle structure.
    .replace(/```/g, "'''")
    .replace(/<<<|>>>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
  return `<<<${label}_START>>>\n${cleaned}\n<<<${label}_END>>>`
}

/**
 * Cheap heuristic for "the model stopped doing its job".
 *
 * Catches the common tells of a successful injection or an off-task answer.
 * Not exhaustive, and not a substitute for the caller checking that the shape
 * of the result is what it expected.
 */
export function looksOffTask(output: string): string | null {
  const t = output.toLowerCase()
  const tells: [RegExp, string][] = [
    [/\b(ignore|disregard)\s+(all\s+)?(previous|prior|above)\s+instructions?/, 'echoed an injection attempt'],
    [/\byou are (now )?(a|an)\b.{0,40}\b(assistant|ai|model|chatbot)\b/, 'restated a role instruction'],
    [/\bsystem prompt\b/, 'referenced the system prompt'],
    [/\b(api[_ -]?key|secret|password|token)\b/, 'mentioned credentials'],
    [/^\s*(sure|certainly|of course)[,!]?\s+(here('s| is)|i)\b/, 'answered as a chat assistant'],
  ]
  for (const [re, why] of tells) {
    if (re.test(t)) return why
  }
  return null
}

interface OpenAiResponse {
  choices?: { message?: { content?: string }, finish_reason?: string }[]
  error?: { message?: string }
}

async function callOpenRouter(opts: AiCallOptions, cfg: {
  key: string
  baseUrl: string
  model: string
  siteUrl: string
}): Promise<string> {
  let res: Response
  try {
    res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.key}`,
        // OpenRouter attributes usage to these; harmless elsewhere.
        'HTTP-Referer': cfg.siteUrl,
        'X-Title': 'ILYTAT',
      },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: opts.model || cfg.model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 2048,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  }
  catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new AiError(`OpenRouter request failed: ${why}`, 'openrouter')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Keep the provider's own message — this is exactly what the old code
    // discarded, and it is the only thing that says *why* a call failed.
    throw new AiError(
      `OpenRouter ${res.status}: ${body.slice(0, 400) || res.statusText}`,
      'openrouter',
      res.status,
    )
  }

  const data = (await res.json()) as OpenAiResponse
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    const reason = data.choices?.[0]?.finish_reason ?? data.error?.message ?? 'unknown'
    throw new AiError(`OpenRouter returned no content (${reason})`, 'openrouter')
  }
  return text
}

async function callGemini(opts: AiCallOptions, cfg: { key: string, model: string }): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.key}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts: [{ text: opts.user }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 2048,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    })
  }
  catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new AiError(`Gemini request failed: ${why}`, 'gemini')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new AiError(
      `Gemini ${res.status}: ${body.slice(0, 400) || res.statusText}`,
      'gemini',
      res.status,
    )
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] }, finishReason?: string }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new AiError(
      `Gemini returned no content (finishReason: ${data.candidates?.[0]?.finishReason ?? 'unknown'})`,
      'gemini',
    )
  }
  return text
}

/**
 * Calls the configured provider, falling back to Gemini if one is set.
 *
 * On total failure it throws an AiError naming every provider tried and why
 * each failed, rather than a generic "no provider configured".
 */
export async function callAI(opts: AiCallOptions, event?: Parameters<typeof useRuntimeConfig>[0]): Promise<string> {
  const cfg = useRuntimeConfig(event)
  const failures: string[] = []

  const orKey = cfg.openrouterApiKey || cfg.opencloudApiKey
  if (orKey) {
    try {
      return await callOpenRouter(opts, {
        key: orKey,
        baseUrl: cfg.openrouterBaseUrl || cfg.opencloudBaseUrl || 'https://openrouter.ai/api/v1',
        model: cfg.openrouterModel || 'google/gemini-2.5-flash',
        siteUrl: cfg.public?.siteUrl || 'https://sites.ilytat.com',
      })
    }
    catch (e) {
      failures.push(e instanceof Error ? e.message : String(e))
    }
  }

  if (cfg.geminiApiKey) {
    try {
      return await callGemini(opts, {
        key: cfg.geminiApiKey,
        model: cfg.geminiModel || 'gemini-2.5-flash',
      })
    }
    catch (e) {
      failures.push(e instanceof Error ? e.message : String(e))
    }
  }

  if (!failures.length) {
    throw new AiError(
      'No AI provider configured. Set OPENROUTER_API_KEY (or GEMINI_API_KEY).',
      'none',
    )
  }
  throw new AiError(`All AI providers failed — ${failures.join(' | ')}`, 'all')
}

/** Parses a JSON response, tolerating a model that wrapped it in prose. */
export function parseAiJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T
  }
  catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new AiError(`Expected JSON, got: ${raw.slice(0, 200)}`, 'parse')
    }
    return JSON.parse(match[0]) as T
  }
}
