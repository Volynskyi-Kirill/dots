import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

  return {
    title: t('faqTitle'),
    description: t('faqDescription'),
    alternates: {
      canonical: `${baseUrl}/${locale}/faq`,
    },
  };
}

export default function FAQPage() {
  const t = useTranslations('FAQ');

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: t('faq1Q'), acceptedAnswer: { '@type': 'Answer', text: t('faq1A') } },
      { '@type': 'Question', name: t('faq2Q'), acceptedAnswer: { '@type': 'Answer', text: t('faq2A') } },
      { '@type': 'Question', name: t('faq3Q'), acceptedAnswer: { '@type': 'Answer', text: t('faq3A') } },
      { '@type': 'Question', name: t('faq4Q'), acceptedAnswer: { '@type': 'Answer', text: t('faq4A') } }
    ]
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-12">
          {t('title')}
        </h1>
        
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('faq1Q')}</h2>
            <p className="text-muted-foreground text-lg">{t('faq1A')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('faq2Q')}</h2>
            <p className="text-muted-foreground text-lg">{t('faq2A')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('faq3Q')}</h2>
            <p className="text-muted-foreground text-lg">{t('faq3A')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('faq4Q')}</h2>
            <p className="text-muted-foreground text-lg">{t('faq4A')}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
