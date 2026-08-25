import { GameRoom } from '@/components/game/GameRoom';

import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dots-game.com';

  const title = t('roomTitle', { id });
  const description = t('roomDescription', { id });

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}/room/${id}`,
      siteName: 'Dots Game',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: 'Dots Game Room',
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

export default async function RoomPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id } = await params;
  return <GameRoom roomId={id} />;
}
