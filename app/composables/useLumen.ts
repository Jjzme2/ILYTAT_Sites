/**
 * useLumenTracker — global singleton.
 *
 * Registers ONE pointermove + scroll listener for the entire page lifetime.
 * On each animation frame it walks every .lumen-surface element and writes
 * three CSS variables directly to inline style, bypassing Vue's reactive
 * system entirely.  This is intentional: binding pointer coordinates to
 * reactive state would force constant VDOM diffs across every surface on
 * the page at 60 fps.
 *
 * Variables written per element:
 *   --px   cursor X in element-local pixels
 *   --py   cursor Y in element-local pixels
 *   --on   0→1 proximity float (1 = cursor on element, decays over 180 px)
 *
 * Call once from app.vue onMounted.  Subsequent calls are silent no-ops.
 */
interface LumenWindow extends Window { __lumenTrackerActive?: boolean }

export function useLumenTracker(): void {
  if (typeof window === 'undefined') return
  const win = window as LumenWindow
  if (win.__lumenTrackerActive) return
  win.__lumenTrackerActive = true

  const FALLOFF_PX = 180

  let rafId: number | null = null
  let cx = 0
  let cy = 0

  function tick(): void {
    rafId = null
    const surfaces = document.querySelectorAll<HTMLElement>('.lumen-surface')

    for (const el of surfaces) {
      const r = el.getBoundingClientRect()

      const px = cx - r.left
      const py = cy - r.top

      // Euclidean distance from cursor to nearest point on the element's rect
      const dx = px < 0 ? -px : px > r.width  ? px - r.width  : 0
      const dy = py < 0 ? -py : py > r.height ? py - r.height : 0
      const dist = Math.sqrt(dx * dx + dy * dy)

      const on = Math.max(0, 1 - dist / FALLOFF_PX)

      el.style.setProperty('--px', `${px}px`)
      el.style.setProperty('--py', `${py}px`)
      el.style.setProperty('--on', on.toFixed(4))
    }
  }

  function schedule(): void {
    if (rafId === null) rafId = requestAnimationFrame(tick)
  }

  window.addEventListener('pointermove', (e: PointerEvent) => {
    cx = e.clientX
    cy = e.clientY
    schedule()
  }, { passive: true })

  // Scroll changes element viewport positions, so proximity must be recomputed
  window.addEventListener('scroll', schedule, { passive: true, capture: true })
}
