/**
 * useAnalytics — lightweight event tracking composable.
 *
 * Fires a POST to /api/analytics/event (non-blocking, never throws).
 * A session ID is stored in sessionStorage so events from the same browser
 * tab can be grouped into a user journey.
 *
 * Sends the page path and the first-touch referrer with every event. Previously
 * only the event name and a properties bag went over the wire, so the server
 * could count that a CTA was clicked but not say which page it was clicked on
 * or where the visitor came from — which is most of what the number is for.
 *
 * Usage:
 *   const { track } = useAnalytics()
 *   track('cta_click', { label: 'Get a quote' })
 */

/**
 * The referrer as it was on the first page of the visit.
 *
 * `document.referrer` is empty after the first client-side navigation, so
 * without stashing it every event past the landing page reports no source and
 * the site appears to run entirely on direct traffic.
 */
function firstTouchReferrer(): string {
  if (typeof sessionStorage === 'undefined') return ''
  const stored = sessionStorage.getItem('_ilytat_ref')
  if (stored !== null) return stored
  const ref = typeof document !== 'undefined' ? document.referrer : ''
  // Self-referrals are navigation within the site, not a traffic source.
  const external = ref && !ref.includes(window.location.host) ? ref : ''
  sessionStorage.setItem('_ilytat_ref', external)
  return external
}

export function useAnalytics() {
  function getSessionId(): string {
    if (typeof sessionStorage === 'undefined') return ''
    let id = sessionStorage.getItem('_ilytat_sid')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('_ilytat_sid', id)
    }
    return id
  }

  async function track(event: string, properties: Record<string, unknown> = {}): Promise<void> {
    if (import.meta.server) return
    try {
      await $fetch('/api/analytics/event', {
        method: 'POST',
        body: {
          event,
          properties,
          sessionId: getSessionId(),
          path: window.location.pathname + window.location.search,
          referrer: firstTouchReferrer(),
        },
      })
    }
    catch { /* analytics must never break the user experience */ }
  }

  return { track }
}
