import { useTranslations } from "next-intl"
import { LanguageToggle } from "@/components/language-toggle"
import { LobbyForms } from "@/components/lobby/LobbyForms"

import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: ['Dots game online', 'play tochka', 'точка игра', 'точка онлайн', 'dots strategy game'],
  };
}

export default function Page() {
  const t = useTranslations('Index');
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
            {t('title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('subtitle')}
          </p>
        </section>

        <LobbyForms />

        <section className="mt-16 max-w-3xl mx-auto prose dark:prose-invert">
          <h3>{t('howToPlay')}</h3>
          <ul>
            <li><strong>{t('objectiveTitle')}</strong> {t('objectiveText')}</li>
            <li><strong>{t('placementTitle')}</strong> {t('placementText')}</li>
            <li><strong>{t('capturingTitle')}</strong> {t('capturingText')}</li>
            <li><strong>{t('winningTitle')}</strong> {t('winningText')}</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
