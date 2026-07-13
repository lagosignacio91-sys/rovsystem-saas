import { createContext, useContext } from 'react'

// Contexto y hook del tema. Separados del componente ThemeProvider para no
// mezclar componente y no-componente en un mismo archivo (Fast Refresh).
export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {}, setTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}
