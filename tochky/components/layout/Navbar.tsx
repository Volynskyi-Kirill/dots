import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { LanguageToggle } from "@/components/language-toggle"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileNav } from "./MobileNav"

export function Navbar() {
  const t = useTranslations('Navbar');

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
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('play')}
            </Link>
            <Link href="/rules" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('rules')}
            </Link>
            <Link href="/guide" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('guide')}
            </Link>
            <Link href="/faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('faq')}
            </Link>
            <Link href="/feedback" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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
