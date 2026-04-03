/**
 * useAnalytics — lightweight event tracking composable.
 *
 * Fires a POST to /api/analytics/event (non-blocking, never throws).
 * A session ID is stored in sessionStorage so events from the same browser
 * tab can be grouped into a user journey.
 *
 * Usage:
 *   const { track } = useAnalytics()
 *   track('checkout_initiated', { packageName: 'Starter', billingCycle: 'monthly' })
 */
export function useAnalytics() {
  function getSessionId(): string {
    if (typeof sessionStorage === 'undefined') return ''
    let id = sessionStorage.getItem('_ilytat_sid')
    if (!id) {
      id = Date.now().toString(36) + Math.random().toString(36).slice(2)
      sessionStorage.setItem('_ilytat_sid', id)
    }
    return id
  }

  async function track(event: string, properties: Record<string, unknown> = {}): Promise<void> {
    try {
      await $fetch('/api/analytics/event', {
        method: 'POST',
        body: { event, properties, sessionId: getSessionId() },
      })
    }
    catch { /* analytics must never break the user experience */ }
  }

  return { track }
}
