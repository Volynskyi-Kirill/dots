"use client";
import { useState, useEffect } from 'react';
import { GameState } from '@/lib/types';

function DisconnectCountdown({ deadline }: { deadline: number }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));

  useEffect(() => {
    const int = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 100);
    return () => clearInterval(int);
  }, [deadline]);

  return <span>{left}s</span>;
}

export function DisconnectOverlay({ gameState, t }: { gameState: GameState, t: (key: string) => string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
      <div className="bg-card border shadow-xl rounded-xl p-6 text-center animate-pulse">
        <h3 className="text-xl font-bold text-destructive mb-2">{t("playerDisconnected")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("playerLeftRoom", { player: gameState.p1Disconnected ? 1 : 2 })}
        </p>
        {gameState.disconnectDeadline && (
          <div className="text-2xl font-mono text-primary">
            <DisconnectCountdown deadline={gameState.disconnectDeadline} />
          </div>
        )}
      </div>
    </div>
  );
}
