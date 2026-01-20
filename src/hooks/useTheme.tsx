import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'bear-bites-theme'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  systemTheme: ResolvedTheme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  // Default to dark to match the HTML default (avoids flash)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('dark')
  const [mounted, setMounted] = useState(false)

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    return theme === 'system' ? systemTheme : theme
  }, [theme, systemTheme])

  useEffect(() => {
    setMounted(true)

    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored)
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0f172a' : '#003DA5',
      )
    }
  }, [resolvedTheme, mounted])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      systemTheme,
      isDark: resolvedTheme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, systemTheme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
