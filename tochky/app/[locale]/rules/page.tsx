import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

  return {
    title: t('rulesTitle'),
    description: t('rulesDescription'),
    alternates: {
      canonical: `${baseUrl}/${locale}/rules`,
    },
  };
}

export default function RulesPage() {
  const t = useTranslations('Rules');

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8">
          {t('title')}
        </h1>
        
        <div className="prose dark:prose-invert max-w-none text-lg">
          <p className="mb-6">
            <strong>{t('objectiveTitle')}</strong> {t('objectiveText')}
          </p>
          <p className="mb-6">
            <strong>{t('placementTitle')}</strong> {t('placementText')}
          </p>
          <p className="mb-6">
            <strong>{t('capturingTitle')}</strong> {t('capturingText')}
          </p>
          <p className="mb-6">
            <strong>{t('winningTitle')}</strong> {t('winningText')}
          </p>
        </div>
      </div>
    </main>
  )
}
