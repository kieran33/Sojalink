import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '~/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
