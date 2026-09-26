import { GameRoom } from '@/components/game/GameRoom';

import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://krapki.tech';

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
      url: new URL(`/${locale}/room/${id}`, baseUrl).toString(),
      siteName: 'Dots Game',
      images: [
        {
          url: new URL('/og-image.jpg', baseUrl).toString(),
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
      images: [new URL('/og-image.jpg', baseUrl).toString()],
    },
  };
}

export default async function RoomPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id } = await params;
  return <GameRoom roomId={id} />;
}
