"use client";

import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/routing"
import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileNav } from "./MobileNav"

export function Navbar() {
  const t = useTranslations('Navbar');
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `text-sm font-medium transition-colors ${
      isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
    }`;
  };

  return (
    <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-50">
      <div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-6">
          <MobileNav 
            tPlay={t('play')} 
            tRules={t('rules')} 
            tGuide={t('guide')} 
            tFaq={t('faq')} 
            tFeedback={t('feedback')}
          />
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Dots
          </Link>
          <nav className="hidden sm:flex gap-4">
            <Link href="/" className={getLinkClass("/")}>
              {t('play')}
            </Link>
            <Link href="/rules" className={getLinkClass("/rules")}>
              {t('rules')}
            </Link>
            <Link href="/guide" className={getLinkClass("/guide")}>
              {t('guide')}
            </Link>
            <Link href="/faq" className={getLinkClass("/faq")}>
              {t('faq')}
            </Link>
            <Link href="/feedback" className={getLinkClass("/feedback")}>
              {t('feedback')}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>
    </header>
  )
}
