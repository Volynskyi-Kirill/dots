"use client";

import { useEffect, useState, useRef } from 'react';
import { GameState } from '@/lib/types';
import { useSound } from '@/components/sound-provider';

interface TimerProps {
  gameState: GameState;
  player: 1 | 2;
}

export function Timer({ gameState, player }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(-1);
  const { playSound } = useSound();

  useEffect(() => {
    if (!gameState.settings?.timerEnabled) return;

    const targetTime = player === 1 ? gameState.timeP1 : gameState.timeP2;
    
    // If not playing, or not this player's turn, just show static time
    if (gameState.status !== 'playing' || gameState.currentTurn !== player) {
      setTimeLeft(targetTime);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = -1; // Reset tick
      return;
    }

    // Otherwise animate countdown
    const updateTimer = () => {
      const now = Date.now();
      const passed = now - gameState.lastMoveTime;
      const current = Math.max(0, targetTime - passed);
      
      setTimeLeft(current);
      
      // Play tick sound when less than 10 seconds remain, once per second
      if (current > 0 && current < 10500) {
        const currentSecond = Math.floor(current / 1000);
        if (currentSecond !== lastTickRef.current) {
          lastTickRef.current = currentSecond;
          playSound('timer_tick');
        }
      } else {
        lastTickRef.current = -1;
      }
      
      if (current > 0) {
        rafRef.current = requestAnimationFrame(updateTimer);
      }
    };

    rafRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState, player, gameState.timeP1, gameState.timeP2, gameState.lastMoveTime, gameState.status, gameState.currentTurn, playSound]);

  if (!gameState.settings?.timerEnabled) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const ms = Math.floor((timeLeft % 1000) / 100);

  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}${minutes === 0 && seconds < 15 ? `.${ms}` : ''}`;

  return (
    <div className={`font-mono font-bold text-sm ${timeLeft < 15000 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
      {formatted}
    </div>
  );
}
