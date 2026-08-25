import { GameRoom } from '@/components/game/GameRoom';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Room ${id} | Dots Game`,
    description: `Join room ${id} to play Dots online.`,
  };
}

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GameRoom roomId={id} />;
}
