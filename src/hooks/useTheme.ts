import { useEffect, useState } from 'react'

export type AppTheme = 'dark' | 'light'

const THEME_KEY = 'mt_theme'

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#f4f7fb' : '#05050f')
}

export function getStoredTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const setTheme = (next: AppTheme) => setThemeState(next)
  const toggleTheme = () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))

  return { theme, setTheme, toggleTheme }
}
