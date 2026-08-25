import { useTranslations } from "next-intl"
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

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 flex-1 flex flex-col mt-4">
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('subtitle')}
          </p>
        </section>

        <LobbyForms />
      </div>
    </main>
  )
}
