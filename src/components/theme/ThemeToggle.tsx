import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'
  const Icon = isLight ? Moon : Sun

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-10 h-10 rounded-2xl glass border border-white/10 flex items-center justify-center text-white/55 hover:text-white/90 hover:border-white/20 transition-colors shadow-none"
      title={isLight ? 'Włącz ciemny motyw' : 'Włącz jasny motyw'}
      aria-label={isLight ? 'Włącz ciemny motyw' : 'Włącz jasny motyw'}
    >
      <Icon size={15} />
    </button>
  )
}
