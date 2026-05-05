/**
 * Theme management composable.
 *
 * Three named themes:
 *   ember — warm gold/dark (default)
 *   frost  — cool violet/midnight
 *   void   — electric cobalt/deep space
 *
 * Active theme is persisted in localStorage and applied as a data-theme
 * attribute on <html>, which drives all CSS custom property overrides in main.css.
 */

export type Theme = 'ember' | 'frost' | 'void'

const STORAGE_KEY = 'ilytat-theme'
const DEFAULT_THEME: Theme = 'ember'

export const useTheme = () => {
  const theme = useState<Theme>('theme', () => DEFAULT_THEME)
  const { track } = useAnalytics()

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem(STORAGE_KEY, t)
    theme.value = t
  }

  // setTheme is the user-facing action — applyTheme is the internal primitive.
  // We only track on explicit user selection, not on init restore.
  const setTheme = (t: Theme) => {
    applyTheme(t)
    track('theme_changed', { theme: t })
  }

  const init = () => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    applyTheme(saved ?? DEFAULT_THEME)
  }

  return { theme, setTheme, init }
}
