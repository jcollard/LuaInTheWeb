import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { ThemeContext } from './context'
import type { Theme, ThemeContextValue } from './types'

const STORAGE_KEY = 'lua-ide-theme'

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // localStorage not available
  }
  return null
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage not available
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Priority: localStorage > default (dark)
    return getStoredTheme() ?? 'dark'
  })

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    saveTheme(newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState(current => {
      const newTheme = current === 'dark' ? 'light' : 'dark'
      saveTheme(newTheme)
      return newTheme
    })
  }, [])

  const value: ThemeContextValue = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
