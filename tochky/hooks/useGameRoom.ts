import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { wsService } from '@/lib/websocket';
import { GameState } from '@/lib/types';
import { DEFAULT_BOARD_WIDTH, DEFAULT_BOARD_HEIGHT } from '@/lib/constants';

export function useGameRoom(roomId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);

  useEffect(() => {
    let settings = undefined;
    if (searchParams.get('timer') === '1' || searchParams.get('w') || searchParams.get('h')) {
      settings = {
        timerEnabled: searchParams.get('timer') === '1',
        timerMode: searchParams.get('mode') === 'move' ? 'move' : 'game',
        initialTime: parseInt(searchParams.get('time') || '300000', 10),
        increment: parseInt(searchParams.get('inc') || '3000', 10),
        boardWidth: parseInt(searchParams.get('w') || DEFAULT_BOARD_WIDTH.toString(), 10),
        boardHeight: parseInt(searchParams.get('h') || DEFAULT_BOARD_HEIGHT.toString(), 10),
        isLocal: searchParams.get('local') === '1',
      };
    }

    wsService.connect(roomId, settings);

    const onState = (state: GameState) => {
      setGameState(state);
      setError(null);
    };

    const onError = (err: string) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    };

    const onWelcome = (data: { playerId: number }) => {
      setMyPlayerId(data.playerId);
    };

    wsService.on('state', onState);
    wsService.on('error', onError);
    wsService.on('welcome', onWelcome);

    return () => {
      wsService.off('state', onState);
      wsService.off('error', onError);
      wsService.off('welcome', onWelcome);
      wsService.disconnect();
    };
  }, [roomId, searchParams]);

  const doLeaveRoom = () => {
    // We assume useGameRoom is the sole owner of the WS connection here.
    // forceDisconnect is used to immediately notify the server that we left.
    wsService.forceDisconnect();
    router.push('/');
  };

  const handleMove = (x: number, y: number) => {
    if (gameState && gameState.status === 'playing') {
      wsService.send('move', { x, y });
    }
  };

  let p1Score = 0;
  let p2Score = 0;
  if (gameState) {
    p1Score = (gameState.capturedP1 || []).filter(p => gameState.board[p.y] && gameState.board[p.y][p.x] === 2).length;
    p2Score = (gameState.capturedP2 || []).filter(p => gameState.board[p.y] && gameState.board[p.y][p.x] === 1).length;
  }

  return {
    gameState,
    error,
    myPlayerId,
    p1Score,
    p2Score,
    doLeaveRoom,
    handleMove
  };
}
