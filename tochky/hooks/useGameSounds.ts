import { useEffect, useRef } from 'react';
import { GameState } from '@/lib/types';
import { GAME_STATUS } from '@/lib/constants';

function playSound(path: string, volume: number) {
  const audio = new Audio(path);
  audio.volume = volume;
  audio.play().catch(e => console.warn('Audio playback prevented:', e));
}

export function useGameSounds(
  gameState: GameState | null,
  myPlayerId: number | null | undefined,
  soundEnabled: boolean,
  volume: number,
) {
  const prevTurnRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string>('');

  useEffect(() => {
    if (!soundEnabled || !gameState) return;

    // Detect move by comparing currentTurn
    if (prevTurnRef.current !== null && gameState.currentTurn !== prevTurnRef.current) {
        let soundPath = '/sounds/move_self.mp3';
        
        if (gameState.settings?.isLocal) {
           // In local mode, alternate sounds based on whose turn it is now.
           // If currentTurn is 1, Player 2 just played.
           if (gameState.currentTurn === 1) {
             soundPath = '/sounds/move_opponent.mp3';
           }
        } else {
           // If the current turn is now ours, the opponent just moved
           if (gameState.currentTurn === myPlayerId) {
             soundPath = '/sounds/move_opponent.mp3';
           }
        }
        
        playSound(soundPath, volume);
    }
    
    // Always update the ref so we know what the last seen turn was
    prevTurnRef.current = gameState.currentTurn;

    // Detect game over
    if (gameState.status === GAME_STATUS.FINISHED && prevStatusRef.current === GAME_STATUS.PLAYING) {
       if (gameState.settings?.isLocal) {
           // In local mode, play win sound (skip on tie)
           if (gameState.winner) {
             playSound('/sounds/win.mp3', volume);
           }
       } else {
           if (gameState.winner === myPlayerId) {
             playSound('/sounds/win.mp3', volume);
           } else if (gameState.winner) {
             playSound('/sounds/lose.mp3', volume);
           }
       }
    }
    
    prevStatusRef.current = gameState.status;

  }, [gameState, myPlayerId, soundEnabled, volume]);
}
