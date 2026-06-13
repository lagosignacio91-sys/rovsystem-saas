import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../theme/ThemeProvider'

export default function ThemeToggle({ size = 18 }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      className="gl-icon-btn"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
    >
      {isDark ? <Sun size={size} strokeWidth={2} /> : <Moon size={size} strokeWidth={2} />}
    </button>
  )
}
