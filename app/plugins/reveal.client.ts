/**
 * Scroll-reveal animations, for the whole document, for the life of the tab.
 *
 * ── Why this is a plugin and not a composable ─────────────────────────────
 *
 * It used to be `useReveal()`, called from a page's `setup`. That had three
 * failure modes, and the first one was shipping:
 *
 *   1. A page that used `data-reveal` but forgot to call `useReveal()` had its
 *      content permanently invisible — but only for visitors who arrived by
 *      clicking a link. `js-enabled` is added to <html> by the first page that
 *      runs the composable and is never removed, and it is what applies
 *      `opacity: 0` to every `[data-reveal]` element on the site. So a direct
 *      load of such a page looked perfect (no `js-enabled`, no hiding) while a
 *      click through from the homepage rendered the hero and then a void.
 *      `/web-design/*` — the town landing pages the local-search work exists
 *      for — were in exactly this state: three reveal blocks, nothing to
 *      reveal them, every one of them blank on arrival from the homepage.
 *
 *   2. The observer only ever saw elements that existed at `onMounted`.
 *      Anything rendered later was never observed and so never revealed. That
 *      is not an edge case here: the homepage's portfolio and testimonials
 *      sections are behind `v-if` on a `lazy: true` fetch, so they mount after
 *      the scan has already run.
 *
 *   3. Its cleanup — `return () => io.disconnect()` inside `onMounted` — did
 *      nothing. Vue does not treat an `onMounted` return value as a teardown.
 *
 * All three share one cause: the reveal was scoped to a page while the thing
 * it manipulates (`js-enabled` on the document element) is global and
 * permanent. Making the mechanism global too removes the whole class of bug
 * rather than the three instances of it — there is no longer anything for a
 * page to remember to do.
 *
 * ── Why a MutationObserver ────────────────────────────────────────────────
 *
 * Re-scanning on `page:finish` would fix navigation but not case 2, and
 * chasing each late-render case with its own hook is how case 2 happened. The
 * MutationObserver makes "an element with data-reveal entered the DOM" the
 * trigger, which is the actual condition, whatever caused it — a route change,
 * a resolved fetch, a `v-if` flipping.
 *
 * ── Failure mode ──────────────────────────────────────────────────────────
 *
 * If IntersectionObserver is missing, this returns before adding `js-enabled`,
 * so nothing is hidden and the page reads as a plain unanimated document. The
 * content being visible is the thing worth protecting; the animation is not.
 */
export default defineNuxtPlugin(() => {
  if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return

  document.documentElement.classList.add('js-enabled')

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        el.style.transitionDelay = `${el.dataset.revealDelay ?? '0'}ms`
        el.classList.add('is-revealed')
        io.unobserve(el)
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -48px 0px' },
  )

  const scan = (root: ParentNode): void => {
    for (const el of root.querySelectorAll('[data-reveal]:not(.is-revealed)')) io.observe(el)
  }

  const start = (): void => {
    scan(document)

    // Picks up everything that arrives after this point: the next page on a
    // client-side navigation, and sections that render once their data does.
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue
          const el = node as Element
          if (el.matches('[data-reveal]') && !el.classList.contains('is-revealed')) io.observe(el)
          scan(el)
        }
      }
    }).observe(document.body, { childList: true, subtree: true })
  }

  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, { once: true })
})
