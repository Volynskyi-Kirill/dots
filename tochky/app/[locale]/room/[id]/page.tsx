import { GameRoom } from '@/components/game/GameRoom';

import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('roomTitle', { id }),
    description: t('roomDescription', { id }),
  };
}

export default async function RoomPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id } = await params;
  return <GameRoom roomId={id} />;
}
