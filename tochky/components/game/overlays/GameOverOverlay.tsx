"use client";
import { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { GameState } from '@/lib/types';
import { wsService } from '@/lib/websocket';

export function GameOverOverlay({
  gameState, myPlayerId, t, p1Score, p2Score, onRematch, onLeave
}: {
  gameState: GameState;
  myPlayerId: number;
  t: (key: string, values?: Record<string, any>) => string;
  p1Score: number;
  p2Score: number;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const iWon = gameState.winner === myPlayerId;
  const isTie = gameState.winner === 0;
  const isLocal = gameState.settings?.isLocal;
  const confettiRan = useRef(false);
  const opponentDisconnected = myPlayerId === 1 ? gameState.p2Disconnected : gameState.p1Disconnected;

  useEffect(() => {
    if ((iWon || (isLocal && !isTie)) && !confettiRan.current) {
      confettiRan.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        const end = Date.now() + 2000;
        const colors = ['#60a5fa', '#f87171', '#fbbf24', '#34d399'];
        (function frame() {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      });
    }
  }, [iWon, isLocal, isTie]);

  const getTitle = () => {
    if (isTie) return t('tieTitle');
    if (isLocal) return t('playerWins', { turn: gameState.winner });
    return iWon ? t('winTitle') : t('loseTitle');
  };

  const getReasonKey = () => {
    if (!gameState.winReason || gameState.winReason === 'boardFull') return 'winReasonBoardFull';

    const reasonMap: Record<string, { local: string; win: string; lose: string }> = {
      surrender: { local: 'winReasonSurrenderLocal', win: 'winReasonSurrenderWin', lose: 'winReasonSurrenderLose' },
      timeout: { local: 'winReasonTimeoutLocal', win: 'winReasonTimeoutWin', lose: 'winReasonTimeoutLose' },
      disconnect: { local: 'winReasonDisconnectLocal', win: 'winReasonDisconnectWin', lose: 'winReasonDisconnectLose' },
      consecutive_passes: { local: 'winReasonPasses', win: 'winReasonPasses', lose: 'winReasonPasses' },
      consecutivePasses: { local: 'winReasonPasses', win: 'winReasonPasses', lose: 'winReasonPasses' }
    };

    const status = isLocal ? 'local' : (iWon ? 'win' : 'lose');
    return reasonMap[gameState.winReason]?.[status] || 'winReasonBoardFull';
  };

  const title = getTitle();
  const reasonKey = getReasonKey();

  const getTitleColor = () => {
    if (isTie) return 'text-muted-foreground';
    if (isLocal) return gameState.winner === 1 ? 'text-blue-400' : 'text-red-400';
    return iWon ? 'text-yellow-400' : 'text-destructive';
  };

  return (
    <div className="absolute inset-0 bg-background/85 backdrop-blur-sm z-20 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card border shadow-2xl rounded-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-90 duration-300">
        <h2 className={`text-3xl font-black mb-1 ${getTitleColor()}`}>
          {title}
        </h2>
        <p className="text-xs text-muted-foreground mb-6">{t(reasonKey, { winner: gameState.winner, loser: gameState.winner === 1 ? 2 : 1 })}</p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t('scoreCaptured')}</div>
          <div className="flex items-center justify-center gap-4">
            <span className={`text-5xl font-black tabular-nums ${myPlayerId === 1 ? 'text-blue-400' : 'text-muted-foreground/50'}`}>{p1Score}</span>
            <span className="text-3xl font-light text-muted-foreground">:</span>
            <span className={`text-5xl font-black tabular-nums ${myPlayerId === 2 ? 'text-red-400' : 'text-muted-foreground/50'}`}>{p2Score}</span>
          </div>
        </div>

        <div className="w-full h-px bg-border my-4" />

        <div className="mb-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t('matchScore')}</div>
          <div className="flex items-center justify-center gap-4">
            <span className="text-5xl font-black text-blue-400 tabular-nums">{gameState.matchScoreP1 ?? 0}</span>
            <span className="text-3xl font-light text-muted-foreground">:</span>
            <span className="text-5xl font-black text-red-400 tabular-nums">{gameState.matchScoreP2 ?? 0}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {opponentDisconnected ? (
            <div className="w-full px-6 py-3 bg-secondary/50 text-muted-foreground rounded-xl text-sm border flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" />
              {t('playerDisconnected')}
            </div>
          ) : (
            <>
              {!gameState.rematchRequestedBy && (
                <button
                  onClick={onRematch}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-base transition-colors shadow-sm"
                >
                  🔄 {t('rematch')}
                </button>
              )}
              {gameState.rematchRequestedBy === myPlayerId && !isLocal && (
                <span className="text-sm text-muted-foreground animate-pulse border px-4 py-3 rounded-xl bg-secondary/30">
                  {t('waiting')}
                </span>
              )}
              {!!gameState.rematchRequestedBy && (isLocal || gameState.rematchRequestedBy !== myPlayerId) && (
                <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-primary">{t('rematchQuestion')}</p>
              <div className="flex gap-3">
                <button onClick={() => wsService.send('answer_rematch', { accept: true })} className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-bold hover:bg-green-500/30 transition-colors">{t('yes')}</button>
                <button onClick={() => wsService.send('answer_rematch', { accept: false })} className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-colors">{t('no')}</button>
              </div>
            </div>
          )}
          </>
          )}
          <button
            onClick={onLeave}
            className="w-full px-6 py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t('leave')}
          </button>
        </div>
      </div>
    </div>
  );
}
