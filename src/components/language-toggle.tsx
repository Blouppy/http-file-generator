"use client"

import { Languages } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import type { Language } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.toggleLanguage}>
          <Languages className="size-[1.2rem]" />
          <span className="sr-only">{t.toggleLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={language} onValueChange={(v) => setLanguage(v as Language)}>
          <DropdownMenuRadioItem value="en">
            {t.languageEnglish}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="fr">
            {t.languageFrench}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
