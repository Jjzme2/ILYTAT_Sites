/**
 * useLumenPrefs — persisted toggle for the site's kintsugi light effects.
 *
 * The preference is stored in localStorage under LUMEN_KEY and applied as a
 * data-lumen="on"|"off" attribute on <html>. CSS reads that attribute to suppress
 * every animation and pointer effect without removing DOM elements, keeping the
 * structural shape layer (clip-path) visible even when light is off.
 *
 * Toggle events are sent to /api/analytics/event so we can measure how many
 * visitors prefer the site with or without the lumen effects — useful signal
 * for deciding how much to invest in this design direction.
 *
 * Call initLumen() once in app.vue onMounted (after theme init) to restore
 * the user's saved preference before first paint.
 */

const LUMEN_KEY = 'ilytat-lumen'

export const useLumenPrefs = () => {
  const lumenEnabled = useState<boolean>('lumenEnabled', () => true)
  const { track } = useAnalytics()

  function applyLumen(enabled: boolean): void {
    document.documentElement.setAttribute('data-lumen', enabled ? 'on' : 'off')
    localStorage.setItem(LUMEN_KEY, enabled ? 'on' : 'off')
    lumenEnabled.value = enabled
  }

  function toggleLumen(): void {
    const next = !lumenEnabled.value
    applyLumen(next)
    track('lumen_toggled', { enabled: next })
  }

  function initLumen(): void {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem(LUMEN_KEY)
    // Default on; only disable if the user has explicitly saved 'off'
    applyLumen(saved !== 'off')
  }

  return { lumenEnabled, toggleLumen, initLumen }
}
