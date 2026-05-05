/**
 * useLumenTracker — global singleton.
 *
 * Registers ONE pointermove + scroll + resize listener for the entire page
 * lifetime. On each animation frame it walks the cached .lumen-surface list
 * and writes three CSS variables directly to inline style, bypassing Vue's
 * reactive system entirely — binding pointer coordinates to reactive state
 * would force constant VDOM diffs across every surface at 60 fps.
 *
 * Performance vs. the naive implementation:
 *   • Surface list is cached in a module-level array and re-queried only when
 *     the DOM actually changes (MutationObserver), not on every frame.
 *   • DOMRect values are cached per-element and only rebuilt on scroll or
 *     resize (elements don't move relative to the viewport during pointer
 *     moves alone).
 *   • The entire tick is a no-op when data-lumen="off" is on <html>, so the
 *     lumen toggle has zero CPU cost when the effects are disabled.
 *
 * Variables written per element:
 *   --px   cursor X in element-local pixels
 *   --py   cursor Y in element-local pixels
 *   --on   0→1 proximity float (1 = cursor on element, decays over 180 px)
 *
 * Call once from app.vue onMounted. Subsequent calls are silent no-ops.
 */
interface LumenWindow extends Window { __lumenTrackerActive?: boolean }

export function useLumenTracker(): void {
  if (typeof window === 'undefined') return
  const win = window as LumenWindow
  if (win.__lumenTrackerActive) return
  win.__lumenTrackerActive = true

  const FALLOFF_PX = 180

  let rafId:      number | null = null
  let cx = 0
  let cy = 0

  let surfaces:    HTMLElement[] = []
  let surfacesDirty = true
  const rectCache  = new WeakMap<HTMLElement, DOMRect>()
  let rectsValid   = false

  function collectSurfaces(): void {
    surfaces      = Array.from(document.querySelectorAll<HTMLElement>('.lumen-surface'))
    surfacesDirty = false
    rectsValid    = false
  }

  function buildRects(): void {
    for (const el of surfaces) {
      rectCache.set(el, el.getBoundingClientRect())
    }
    rectsValid = true
  }

  function tick(): void {
    rafId = null

    // CSS-driven kill switch — zero work when light effects are disabled
    if (document.documentElement.dataset.lumen === 'off') return

    if (surfacesDirty) collectSurfaces()
    if (!rectsValid)   buildRects()

    for (const el of surfaces) {
      const r = rectCache.get(el)
      if (!r) continue

      const px = cx - r.left
      const py = cy - r.top
      const dx = px < 0 ? -px : px > r.width  ? px - r.width  : 0
      const dy = py < 0 ? -py : py > r.height ? py - r.height : 0
      const dist = Math.sqrt(dx * dx + dy * dy)
      const on   = Math.max(0, 1 - dist / FALLOFF_PX)

      el.style.setProperty('--px', `${px}px`)
      el.style.setProperty('--py', `${py}px`)
      el.style.setProperty('--on', on.toFixed(4))
    }
  }

  function schedule(): void {
    if (rafId === null) rafId = requestAnimationFrame(tick)
  }

  // Mark the surface list as dirty when nodes are added or removed — covers
  // Nuxt page transitions where the entire page subtree is swapped out.
  const mo = new MutationObserver(() => { surfacesDirty = true })
  mo.observe(document.body, { childList: true, subtree: true })

  // Initial population (body is ready by the time onMounted fires)
  collectSurfaces()

  window.addEventListener('pointermove', (e: PointerEvent) => {
    cx = e.clientX
    cy = e.clientY
    schedule()
  }, { passive: true })

  // Scroll shifts element viewport positions — invalidate the rect cache
  window.addEventListener('scroll', () => {
    rectsValid = false
    schedule()
  }, { passive: true, capture: true })

  // Resize changes both layout dimensions and element positions
  window.addEventListener('resize', () => {
    surfacesDirty = true
    schedule()
  }, { passive: true })
}
