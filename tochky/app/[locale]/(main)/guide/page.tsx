import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"
import Image from "next/image"

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
  const tMeta = useTranslations('Metadata');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t('title'),
    description: tMeta('guideDescription'),
    image: `${baseUrl}/og-image.jpg`,
    author: {
      '@type': 'Organization',
      name: 'Dots Game',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dots Game',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icons/icon.jpg`,
      },
    },
    mainEntityOfPage: `${baseUrl}/guide`,
  };

  const breadcrumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Dots Game',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t('title'),
        item: `${baseUrl}/guide`,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-12 text-center">
          {t('title')}
        </h1>
        
        <div className="space-y-24">
          
          {/* Lobby Section */}
          <section>
            <h2 className="text-3xl font-bold mb-8 text-center">{t('lobbySection')}</h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="prose dark:prose-invert text-lg">
                <p>{t('lobbyDesc')}</p>
                <p>{t('timerSettings')}</p>
              </div>
              <div className="bg-muted rounded-xl overflow-hidden shadow-lg border">
                <Image src="/images/guide/lobby.png" alt="Lobby" width={800} height={600} className="w-full h-auto object-cover" unoptimized />
              </div>
            </div>
          </section>

          {/* In-Game Section */}
          <section>
            <h2 className="text-3xl font-bold mb-8 text-center">{t('inGameSection')}</h2>
            
            <div className="space-y-16">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="bg-muted rounded-xl overflow-hidden shadow-lg border md:order-2">
                  <Image src="/images/guide/game_room.png" alt="Invite Friend" width={800} height={600} className="w-full h-auto object-cover" unoptimized />
                </div>
                <div className="prose dark:prose-invert text-lg md:order-1">
                  <p>{t('inviteFriend')}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="prose dark:prose-invert text-lg">
                  <p>{t('undoMove')}</p>
                </div>
                <div className="bg-muted rounded-xl overflow-hidden shadow-lg border">
                  <Image src="/images/guide/undo.png" alt="Undo Move" width={800} height={600} className="w-full h-auto object-cover" unoptimized />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="bg-muted rounded-xl overflow-hidden shadow-lg border md:order-2">
                  <Image src="/images/guide/leave.png" alt="Surrender and Rematch" width={800} height={600} className="w-full h-auto object-cover" unoptimized />
                </div>
                <div className="prose dark:prose-invert text-lg md:order-1">
                  <p>{t('surrenderRematch')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Settings & Controls Section */}
          <section>
            <h2 className="text-3xl font-bold mb-8 text-center">{t('mobileControls')}</h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="prose dark:prose-invert text-lg space-y-3">
                <p><strong>{t('directTouch')}</strong></p>
                <p><strong>{t('dragRelease')}</strong></p>
                <p><strong>{t('themeLanguage')}</strong></p>
              </div>
              <div className="bg-muted rounded-xl overflow-hidden shadow-lg border">
                <Image src="/images/guide/settings.png" alt="Settings & Controls" width={800} height={600} className="w-full h-auto object-cover" unoptimized />
              </div>
            </div>
          </section>
          
        </div>
      </div>
    </main>
  )
}
