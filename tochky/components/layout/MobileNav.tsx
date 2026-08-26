"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/routing";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileNav({ tPlay, tRules, tGuide, tFaq, tFeedback }: { tPlay: string, tRules: string, tGuide: string, tFaq: string, tFeedback: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `text-base transition-colors ${isActive ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground font-medium'}`;
  };

  return (
    <div className="sm:hidden flex items-center">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} aria-label="Menu">
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b border-border/40 shadow-lg p-4 flex flex-col gap-4 z-50">
          <Link href="/" className={getLinkClass("/")} onClick={() => setIsOpen(false)}>{tPlay}</Link>
          <Link href="/rules" className={getLinkClass("/rules")} onClick={() => setIsOpen(false)}>{tRules}</Link>
          <Link href="/guide" className={getLinkClass("/guide")} onClick={() => setIsOpen(false)}>{tGuide}</Link>
          <Link href="/faq" className={getLinkClass("/faq")} onClick={() => setIsOpen(false)}>{tFaq}</Link>
          <Link href="/feedback" className={getLinkClass("/feedback")} onClick={() => setIsOpen(false)}>{tFeedback}</Link>
        </div>
      )}
    </div>
  );
}
