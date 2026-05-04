/**
 * Adds scroll-triggered reveal animations.
 * Usage: add data-reveal (and optionally data-reveal-delay="150") to any element.
 * The composable attaches an IntersectionObserver that adds .is-revealed when
 * the element enters the viewport. CSS handles the actual transition.
 */
export function useReveal() {
  onMounted(() => {
    if (!window.IntersectionObserver) return
    document.documentElement.classList.add('js-enabled')

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const delay = (entry.target as HTMLElement).dataset.revealDelay ?? '0'
            ;(entry.target as HTMLElement).style.transitionDelay = `${delay}ms`
            entry.target.classList.add('is-revealed')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' },
    )

    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el))
    return () => io.disconnect()
  })
}
