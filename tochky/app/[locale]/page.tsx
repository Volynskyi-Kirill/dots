import { useTranslations } from "next-intl"
import { LanguageToggle } from "@/components/language-toggle"
import { LobbyForms } from "@/components/lobby/LobbyForms"

export const metadata = {
  title: 'Dots Game Online | Play Tochka',
  description: 'Play the classic Dots (Tochka) game online with friends. Capture territory, block opponents, and win the match!',
  keywords: ['Dots game online', 'play tochka', 'точка игра', 'точка онлайн', 'dots strategy game'],
}

export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <header className="w-full max-w-5xl mx-auto p-4 flex justify-between items-center border-b border-border/40">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
          Dots
        </h1>
        <LanguageToggle />
      </header>

      <main className="w-full max-w-5xl mx-auto p-4 md:p-8 flex-1 flex flex-col mt-4">
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Play Dots Online
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            The classic territorial strategy game. Enclose your opponent's dots to capture them.
            Play with friends instantly—no sign up required.
          </p>
        </section>

        <LobbyForms />

        <section className="mt-16 max-w-3xl mx-auto prose dark:prose-invert">
          <h3>How to Play</h3>
          <ul>
            <li><strong>Objective:</strong> Surround enemy dots with a continuous line of your own dots to capture them.</li>
            <li><strong>Placement:</strong> Players take turns placing a single dot on an empty grid intersection.</li>
            <li><strong>Capturing:</strong> To capture, form a closed polygon of your dots that encloses at least one enemy dot. Empty spaces inside the polygon are allowed.</li>
            <li><strong>Winning:</strong> The game ends when no more valid moves can be made or players agree to stop. The player with the most captured enemy dots wins.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
