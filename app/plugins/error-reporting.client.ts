/**
 * Client-side error reporting.
 *
 * Forwards browser errors to /api/analytics/error so they show up in the admin
 * Logs tab and the nightly digest. Without this, a JavaScript failure on a
 * visitor's phone is completely invisible — the only signal is a lead that
 * never arrives.
 *
 * Three rules, all of them about not making a bad page worse:
 *
 *   1. Never throw. A reporter that fails must fail silently.
 *   2. Never loop. An error inside the reporter must not report itself, and a
 *      component erroring every render must not send one request per render.
 *   3. Never report noise. Browser extensions, cancelled navigations and the
 *      benign ResizeObserver warning would otherwise be the entire log.
 */

/** Messages that are browser or extension artefacts, not site defects. */
const IGNORED = [
  'ResizeObserver loop',
  'Script error.',
  'Non-Error promise rejection captured',
  'Load failed',
  'NetworkError when attempting to fetch resource',
  'The operation was aborted',
  'cancelled',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  // Turnstile failing to load, in both engines' phrasing.
  //
  // nuxt-turnstile's plugin awaits a bootstrap promise that is `undefined` when
  // challenges.cloudflare.com is blocked, so `await undefined` resolves and it
  // dereferences a `window.turnstile` that never arrived. Chrome throws
  // "undefined (reading 'render')", Safari "null is not an object
  // (evaluating 'o.id')" — one bug, two spellings, and four entries in a
  // nightly digest that had four alerts in it.
  //
  // Suppressed only because it is now *handled*: the review tool detects the
  // missing token and tells the visitor what happened instead of leaving a dead
  // button. The UI state is the signal now, so the log does not need to be —
  // and leaving it in was drowning errors that are genuinely new.
  "reading 'render'",
  "evaluating 'o.id'",
]

/** At most this many reports per page load, ever. */
const MAX_REPORTS = 5

/**
 * Best available description of a thrown value.
 *
 * Reports were arriving from iOS Safari with an empty stack, which made them
 * unactionable — "TypeError: null is not an object (evaluating 'o.id')" with
 * nowhere to look. Safari omits `.stack` on rejections that cross certain async
 * boundaries, and a rejection reason is not required to be an Error at all.
 *
 * So: take the stack when there is one, and when there is not, record enough
 * about the value to narrow it down — its constructor, any error code, and its
 * own enumerable keys. A rejected fetch Response and a null dereference look
 * nothing alike once you can see the shape.
 */
function describe(reason: unknown): string {
  if (reason instanceof Error && reason.stack) return reason.stack
  const parts: string[] = []
  if (reason === null) parts.push('reason: null')
  else if (reason === undefined) parts.push('reason: undefined')
  else {
    parts.push(`type: ${typeof reason}`)
    const ctor = (reason as object)?.constructor?.name
    if (ctor) parts.push(`constructor: ${ctor}`)
    if (reason instanceof Error) {
      parts.push(`name: ${reason.name}`)
      const code = (reason as Error & { code?: string }).code
      if (code) parts.push(`code: ${code}`)
      parts.push('(no stack — Safari omits it across some async boundaries)')
    }
    else if (typeof reason === 'object') {
      try {
        parts.push(`keys: ${Object.keys(reason as object).slice(0, 10).join(', ')}`)
        parts.push(`value: ${JSON.stringify(reason).slice(0, 300)}`)
      }
      catch { parts.push('value: (not serialisable)') }
    }
    else parts.push(`value: ${String(reason).slice(0, 200)}`)
  }
  return parts.join('\n')
}

export default defineNuxtPlugin((nuxtApp) => {
  const sent = new Set<string>()
  let count = 0
  let reporting = false

  function shouldReport(message: string): boolean {
    if (!message || count >= MAX_REPORTS || reporting) return false
    if (IGNORED.some(pattern => message.includes(pattern))) return false
    // Same error twice on one page load tells us nothing new.
    const key = message.slice(0, 120)
    if (sent.has(key)) return false
    sent.add(key)
    return true
  }

  function report(payload: {
    message: string
    source: 'vue' | 'window' | 'promise'
    stack?: string
    component?: string
  }): void {
    if (!shouldReport(payload.message)) return
    count += 1
    reporting = true

    const body = {
      message: payload.message.slice(0, 300),
      source: payload.source,
      stack: (payload.stack ?? '').split('\n').slice(0, 12).join('\n').slice(0, 1200),
      component: payload.component ?? '',
      path: window.location.pathname + window.location.search,
      ua: navigator.userAgent,
    }

    // keepalive so the report still goes out if the error happened during a
    // navigation that is about to tear the page down.
    fetch('/api/analytics/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
      .catch(() => { /* reporting is best-effort by definition */ })
      .finally(() => { reporting = false })
  }

  nuxtApp.hook('vue:error', (error, instance) => {
    const err = error as Error
    report({
      message: err?.message ?? String(error),
      source: 'vue',
      stack: describe(error),
      component: (instance as { $options?: { __name?: string } })?.$options?.__name ?? '',
    })
  })

  window.addEventListener('error', (e) => {
    report({
      message: e.message || String(e.error ?? 'Unknown error'),
      source: 'window',
      // Keep the file/line/col even when a stack exists — on a minified build
      // that frame is often the only locatable thing in the report.
      stack: [describe(e.error), `at ${e.filename}:${e.lineno}:${e.colno}`]
        .filter(Boolean).join('\n'),
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as (Error & { code?: string }) | string | undefined
    report({
      message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection'),
      source: 'promise',
      stack: describe(reason),
    })
  })
})
