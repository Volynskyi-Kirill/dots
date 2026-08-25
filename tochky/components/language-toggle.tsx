"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "@/i18n/routing"

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const setLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground size-9">
        <Globe className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale("en")} className={locale === "en" ? "font-bold" : ""}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("ru")} className={locale === "ru" ? "font-bold" : ""}>
          Русский
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("uk")} className={locale === "uk" ? "font-bold" : ""}>
          Українська
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("pl")} className={locale === "pl" ? "font-bold" : ""}>
          Polski
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
