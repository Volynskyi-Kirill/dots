import { useEffect, useRef } from 'react';
import { GameState } from '@/lib/types';
import { GAME_STATUS } from '@/lib/constants';

export function useGameSounds(gameState: GameState | null, myPlayerId: number | null | undefined, soundEnabled: boolean) {
  const prevTurnRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string>('');

  useEffect(() => {
    if (!soundEnabled || !gameState) return;

    // Detect move by comparing currentTurn
    if (prevTurnRef.current !== null && gameState.currentTurn !== prevTurnRef.current) {
        let soundPath = '/sounds/move_self.mp3';
        
        if (gameState.settings?.isLocal) {
           // In local mode, let's alternate sounds based on whose turn it is now
           // If currentTurn is 1, Player 2 just played, so play opponent sound.
           if (gameState.currentTurn === 1) {
             soundPath = '/sounds/move_opponent.mp3';
           }
        } else {
           // If the current turn is now ours, it means the opponent just moved
           if (gameState.currentTurn === myPlayerId) {
             soundPath = '/sounds/move_opponent.mp3';
           }
        }
        
        const audio = new Audio(soundPath);
        audio.play().catch(e => console.warn('Audio playback prevented:', e));
    }
    
    // Always update the ref so we know what the last seen turn was
    prevTurnRef.current = gameState.currentTurn;

    // Detect game over
    if (gameState.status === GAME_STATUS.FINISHED && prevStatusRef.current === GAME_STATUS.PLAYING) {
       if (gameState.settings?.isLocal) {
           // In local mode, just play the win sound when the game concludes (unless it's a tie)
           if (gameState.winner) {
             const audio = new Audio('/sounds/win.mp3');
             audio.play().catch(e => console.warn('Audio playback prevented:', e));
           }
       } else {
           if (gameState.winner === myPlayerId) {
             const audio = new Audio('/sounds/win.mp3');
             audio.play().catch(e => console.warn('Audio playback prevented:', e));
           } else if (gameState.winner) {
             const audio = new Audio('/sounds/lose.mp3');
             audio.play().catch(e => console.warn('Audio playback prevented:', e));
           }
       }
    }
    
    prevStatusRef.current = gameState.status;

  }, [gameState, myPlayerId, soundEnabled]);
}
