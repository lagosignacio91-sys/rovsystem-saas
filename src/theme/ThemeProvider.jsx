import { useEffect, useState, useCallback } from 'react'
import { ThemeContext } from './themeContext'

const STORAGE_KEY = 'app-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  // Migrar clave antigua gl-theme si existe
  const legacy = localStorage.getItem('gl-theme')
  if (legacy) { localStorage.setItem(STORAGE_KEY, legacy); localStorage.removeItem('gl-theme') }
  const saved = localStorage.getItem(STORAGE_KEY)
  // 'gold' es tema exclusivo de Olimpo — GL lo mapea a 'dark'
  if (saved === 'light') return 'light'
  if (saved === 'dark' || saved === 'gold') return 'dark'
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Escuchar cambios de Olimpo (otra pestaña o cambio de ruta)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return
      const val = e.newValue
      if (val === 'light') setThemeState('light')
      else if (val === 'dark' || val === 'gold') setThemeState('dark')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme    = useCallback((value) => setThemeState(value), [])
  const toggleTheme = useCallback(() => setThemeState(p => (p === 'dark' ? 'light' : 'dark')), [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
