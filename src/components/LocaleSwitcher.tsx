import { Globe } from 'lucide-react'
import { locales, setLocale, getLocale } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

const BENDERA: Record<string, string> = {
  en: '🇬🇧',
  id: '🇮🇩',
  zh: '🇨🇳',
  ko: '🇰🇷',
}

export default function ParaglideLocaleSwitcher() {
  const currentLocale = getLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 min-w-11"
          aria-label={m.language_label()}
        >
          <Globe className="size-4 mr-1.5" />
          <span className="sr-only">{m.language_label()}</span>
          <span className="text-xs font-medium">{BENDERA[currentLocale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => setLocale(locale)}
            className="flex items-center justify-between gap-2"
          >
            <span>{BENDERA[locale]}</span>
            <span className="text-sm">{m.current_locale({ locale })}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
