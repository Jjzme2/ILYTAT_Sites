/**
 * Automatic page-view tracking.
 *
 * The analytics collection previously held only the events someone remembered
 * to instrument by hand — a CTA click here, a pricing scroll there. There was
 * no denominator. "12 contact submits" cannot be judged without knowing whether
 * 30 people or 3,000 saw the page, and no report could say which of the
 * service pages or blog posts was worth having written.
 *
 * One event per route, on the client only. The server already caches HTML at
 * the edge, so counting server renders would have counted cache misses.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { track } = useAnalytics()
  const router = useRouter()

  // Admin is a private tool, not a page whose traffic is interesting, and its
  // views would distort every ranking in the summary.
  const isCounted = (path: string) => !path.startsWith('/admin')

  let last = ''

  function record(path: string): void {
    // Guard against duplicate fires: the initial page emits both the mount and
    // the router's first afterEach, and query-only changes are the same view.
    const clean = path.split('?')[0] || '/'
    if (clean === last || !isCounted(clean)) return
    last = clean
    void track('page_view', {})
  }

  nuxtApp.hook('app:mounted', () => {
    record(router.currentRoute.value.fullPath)
  })

  router.afterEach((to) => {
    record(to.fullPath)
  })
})
