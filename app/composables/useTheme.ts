/**
 * Theme management composable.
 *
 *   light — warm off-white, the default a first-time visitor sees
 *   dark  — the original "ember" gold-on-near-black palette
 *
 * Active theme is applied as a data-theme attribute on <html>, which drives all
 * CSS custom property overrides in main.css. The choice is persisted in a cookie
 * rather than localStorage so the server renders the correct theme on the first
 * paint instead of flashing light and then switching.
 *
 * With no stored preference we follow the OS via prefers-color-scheme.
 */

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ilytat-theme'

export const useTheme = () => {
  const stored = useCookie<Theme | null>(STORAGE_KEY, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // SSR renders light unless a cookie says otherwise; init() reconciles with the
  // OS preference on the client when no explicit choice has been made.
  const theme = useState<Theme>('theme', () => stored.value ?? 'light')
  const { track } = useAnalytics()

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    theme.value = t
  }

  // setTheme is the user-facing action — applyTheme is the internal primitive.
  // We only track on explicit user selection, not on init restore.
  const setTheme = (t: Theme) => {
    stored.value = t
    applyTheme(t)
    track('theme_changed', { theme: t })
  }

  const toggleTheme = () => setTheme(theme.value === 'dark' ? 'light' : 'dark')

  const init = () => {
    if (stored.value) {
      applyTheme(stored.value)
      return
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme(prefersDark ? 'dark' : 'light')
  }

  return { theme, setTheme, toggleTheme, init }
}
