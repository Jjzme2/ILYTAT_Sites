/**
 * Single AI client for the whole app.
 *
 * generateBlog.ts and the public AI tools use this. utils/aiProvider.js (the
 * quote estimator) has NOT been migrated yet and still carries its own provider
 * list and env reads — it should move here too.
 *
 * Provider is OpenRouter (OpenAI-compatible). One key, one bill, and the model
 * is a config value rather than a URL path — so a model being retired is an env
 * change, not a deploy.
 *
 * There is deliberately no fallback provider. A Gemini fallback used to sit
 * behind this; with its credit depleted it could only ever turn one clear
 * failure into two confusing ones, and it ran after OpenRouter had already
 * spent the time budget. One provider that reports honestly beats two that
 * disagree.
 *
 * Two things this fixes about the old code:
 *
 *   1. Errors were swallowed. `callAI` caught the real provider failure into a
 *      console.warn, then threw a generic "No AI provider available" — which
 *      was false whenever a key WAS set and the
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
  /**
   * How long to wait for the provider, in ms.
   *
   * This was a single hardcoded 45s for every call, which is wrong in both
   * directions. A visitor waiting on the review writer will not sit through 45
   * seconds — they reload or leave. A blog post, meanwhile, is a few thousand
   * tokens of generation that can legitimately take longer than 45s, and when
   * it did, the call aborted with "The operation was aborted due to timeout"
   * and the failure read like a provider outage rather than a deadline.
   *
   * Defaults to INTERACTIVE_TIMEOUT_MS. Background work should pass
   * BACKGROUND_TIMEOUT_MS.
   */
  timeoutMs?: number
}

/** A person is watching a spinner. Fail fast enough that they can retry. */
export const INTERACTIVE_TIMEOUT_MS = 28_000
/**
 * Nobody is waiting; a cron is. Bounded by the serverless function's own
 * ceiling — overrunning that kills the process with no error handler and so no
 * email, which is strictly worse than a clean failure.
 */
export const BACKGROUND_TIMEOUT_MS = 50_000

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
      signal: AbortSignal.timeout(opts.timeoutMs ?? INTERACTIVE_TIMEOUT_MS),
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
    // 402 is a billing state, not an outage, and the remedy is specific:
    // OpenRouter reserves credit against the requested max_tokens rather than
    // the tokens actually used, so a large ceiling fails on a small balance.
    if (res.status === 402) {
      throw new AiError(
        `OpenRouter is out of credit for a ${opts.maxTokens ?? 2048}-token request. `
        + 'Add credits, or lower AI_BLOG_MAX_TOKENS. '
        + `Provider said: ${body.slice(0, 240)}`,
        'openrouter',
        402,
      )
    }
    // Keep the provider's own message — this is exactly what the old code
    // discarded, and it is the only thing that says *why* a call failed.
    throw new AiError(
      `OpenRouter ${res.status}: ${body.slice(0, 400) || res.statusText}`,
      'openrouter',
      res.status,
    )
  }

  const data = (await res.json()) as OpenAiResponse
  const choice = data.choices?.[0]
  const text = choice?.message?.content
  if (!text) {
    const reason = choice?.finish_reason ?? data.error?.message ?? 'unknown'
    throw new AiError(`OpenRouter returned no content (${reason})`, 'openrouter')
  }

  // A truncated response is worse than an empty one, because it looks like a
  // success. finish_reason was only consulted when the content was empty, so a
  // response cut off at max_tokens was returned intact and failed later as a
  // JSON parse error — which names the wrong cause entirely.
  //
  // It also fails asymmetrically: JSON is emitted in field order, so the tail
  // is lost first. For blog generation that is precisely nextFocalPoint and
  // nextFocalPointWhy, which is why next week's topic kept coming back empty.
  if (choice.finish_reason === 'length') {
    throw new AiError(
      `OpenRouter hit the ${opts.maxTokens ?? 2048}-token ceiling and the reply was cut off `
      + 'mid-structure, so the trailing fields are missing. Raise AI_BLOG_MAX_TOKENS '
      + '(or lower the requested length).',
      'openrouter',
    )
  }
  return text
}

/**
 * Calls OpenRouter.
 *
 * On failure it throws an AiError carrying the provider's own message, rather
 * than a generic "no provider configured".
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
        model: cfg.openrouterModel || 'deepseek/deepseek-chat',
        siteUrl: cfg.public?.siteUrl || 'https://sites.ilytat.com',
      })
    }
    catch (e) {
      failures.push(e instanceof Error ? e.message : String(e))
    }
  }

  if (!failures.length) {
    throw new AiError(
      'No AI provider configured. Set OPENROUTER_API_KEY.',
      'none',
    )
  }
  // Singular now that OpenRouter is the only provider. "All AI providers
  // failed" implied a multi-provider outage and sent diagnosis in exactly the
  // wrong direction when the real cause was a deadline or a token ceiling.
  throw new AiError(`AI request failed — ${failures.join(' | ')}`, 'openrouter')
}

/**
 * Whether any AI provider is usable.
 *
 * Exported so nothing has to re-derive it. The weekly blog cron had its own
 * copy of this test, written before the move to OpenRouter, and the two drifted
 * apart: `callAI` accepts `OPENROUTER_API_KEY` on its own (the base URL has a
 * default), while the cron's copy knew only about the older providers and
 * demanded a base URL alongside the key. It also read `process.env` directly
 * rather than runtimeConfig, so it could not see a `NUXT_`-prefixed override at
 * all.
 *
 * The result was a cron that reported "no AI provider configured", returned
 * HTTP 200, sent no email, and skipped a week of posts — while the AI it had
 * just declared missing would have answered fine.
 *
 * Any future check must call this rather than write its own.
 */
export function hasAiProvider(event?: Parameters<typeof useRuntimeConfig>[0]): boolean {
  const cfg = useRuntimeConfig(event)
  return Boolean(cfg.openrouterApiKey || cfg.opencloudApiKey)
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
