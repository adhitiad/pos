import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { m } from '#/paraglide/messages'
import { Button } from '#/components/ui/button'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      // Area sentuh minimal 44px (rilis mobile) walau ikon tetap kecil.
      className="size-11"
      onClick={() => {
        if (theme === 'dark') setTheme('light')
        else setTheme('dark')
      }}
      aria-label={m.theme_label()}
    >
      <Sun className="size-4 rotate-0 scale-100 dark:rotate-90 dark:scale-0 transition-all" />
      <Moon className="absolute size-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100 transition-all" />
    </Button>
  )
}
