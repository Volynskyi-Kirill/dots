import { useTranslations } from "next-intl"
import { LanguageToggle } from "@/components/language-toggle"
import { LobbyForms } from "@/components/lobby/LobbyForms"

import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';
  
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    keywords: ['Dots game online', 'play tochka', 'точка игра', 'точка онлайн', 'dots strategy game'],
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'en': `${baseUrl}/en`,
        'ru': `${baseUrl}/ru`,
        'uk': `${baseUrl}/uk`,
        'pl': `${baseUrl}/pl`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}`,
      siteName: 'Dots Game',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: 'Dots Game Preview',
        },
      ],
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
  };
}

export default function Page() {
  const t = useTranslations('Index');
  const tMeta = useTranslations('Metadata');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Dots Game',
    description: tMeta('description'),
    url: baseUrl,
    genre: ['Strategy', 'Board Game', 'Abstract Strategy'],
    playMode: 'MultiPlayer',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    inLanguage: ['en', 'ru', 'uk', 'pl']
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: t('faq1Q'),
        acceptedAnswer: { '@type': 'Answer', text: t('faq1A') }
      },
      {
        '@type': 'Question',
        name: t('faq2Q'),
        acceptedAnswer: { '@type': 'Answer', text: t('faq2A') }
      },
      {
        '@type': 'Question',
        name: t('faq3Q'),
        acceptedAnswer: { '@type': 'Answer', text: t('faq3A') }
      },
      {
        '@type': 'Question',
        name: t('faq4Q'),
        acceptedAnswer: { '@type': 'Answer', text: t('faq4A') }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
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

        <section className="mt-16 max-w-3xl mx-auto">
          <div className="prose dark:prose-invert max-w-none">
            <h3 className="text-2xl font-bold mb-4">{t('howToPlay')}</h3>
            <p className="mb-4">
              <strong>{t('objectiveTitle')}</strong> {t('objectiveText')}
            </p>
            <p className="mb-4">
              <strong>{t('placementTitle')}</strong> {t('placementText')}
            </p>
            <p className="mb-4">
              <strong>{t('capturingTitle')}</strong> {t('capturingText')}
            </p>
            <p className="mb-4">
              <strong>{t('winningTitle')}</strong> {t('winningText')}
            </p>

            <h3 className="text-2xl font-bold mt-12 mb-6">{t('faqTitle')}</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold m-0 mb-2">{t('faq1Q')}</h4>
                <p className="m-0 text-muted-foreground">{t('faq1A')}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold m-0 mb-2">{t('faq2Q')}</h4>
                <p className="m-0 text-muted-foreground">{t('faq2A')}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold m-0 mb-2">{t('faq3Q')}</h4>
                <p className="m-0 text-muted-foreground">{t('faq3A')}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold m-0 mb-2">{t('faq4Q')}</h4>
                <p className="m-0 text-muted-foreground">{t('faq4A')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
