import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

  return {
    title: t('guideTitle'),
    description: t('guideDescription'),
    alternates: {
      canonical: `${baseUrl}/${locale}/guide`,
    },
  };
}

export default function GuidePage() {
  const t = useTranslations('Guide');

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-12">
          {t('title')}
        </h1>
        
        <div className="prose dark:prose-invert max-w-none text-lg">
          <h2 className="text-2xl font-bold mt-8 mb-4">{t('lobbySection')}</h2>
          <p className="mb-4">{t('lobbyDesc')}</p>
          <p className="mb-4">{t('timerSettings')}</p>

          <h2 className="text-2xl font-bold mt-12 mb-4">{t('inGameSection')}</h2>
          <ul className="list-disc pl-6 space-y-4 mb-8">
            <li>{t('inviteFriend')}</li>
            <li>{t('undoMove')}</li>
            <li>{t('surrenderRematch')}</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">{t('mobileControls')}</h2>
          <p className="mb-4">
            <strong>{t('directTouch')}</strong>
          </p>
          <p className="mb-8">
            <strong>{t('dragRelease')}</strong>
          </p>
        </div>
      </div>
    </main>
  )
}
