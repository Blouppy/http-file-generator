"use client"

import * as React from "react"
import { useLanguage } from "@/contexts/language-context"
import { translations, type Language } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function FlagGB({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className={className} aria-hidden="true">
      <clipPath id="gb-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
      <clipPath id="gb-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
      <g clipPath="url(#gb-s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#gb-t)" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  )
}

function FlagFR({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="3" height="2" fill="#ED2939"/>
      <rect width="2" height="2" fill="#fff"/>
      <rect width="1" height="2" fill="#002395"/>
    </svg>
  )
}

const flagMap: Record<Language, React.ComponentType<{ className?: string }>> = {
  en: FlagGB,
  fr: FlagFR,
}

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const selectedLanguage = mounted ? language : "en"
  const t = translations[selectedLanguage]
  const CurrentFlag = flagMap[selectedLanguage]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.toggleLanguage}>
          <CurrentFlag className="w-5 h-auto rounded-sm" />
          <span className="sr-only">{t.toggleLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={selectedLanguage} onValueChange={(v) => setLanguage(v as Language)}>
          <DropdownMenuRadioItem value="en" className="gap-2">
            <FlagGB className="w-5 h-auto rounded-sm" />
            {t.languageEnglish}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="fr" className="gap-2">
            <FlagFR className="w-5 h-auto rounded-sm" />
            {t.languageFrench}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
