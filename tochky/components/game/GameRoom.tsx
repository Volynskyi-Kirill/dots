"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { wsService } from '@/lib/websocket';
import { GameBoard } from './GameBoard';
import { Timer } from './Timer';
import { GameState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Copy, Check, Share2, LogOut, Menu, RotateCcw, Flag, Settings, X, Swords, Globe, Moon } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';

export function GameRoom({ roomId }: { roomId: string }) {
  const t = useTranslations('GameRoom');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [surrenderConfirmOpen, setSurrenderConfirmOpen] = useState(false);
  const [controlScheme, setControlScheme] = useState<'direct' | 'drag' | 'confirm'>('direct');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dots_control_scheme');
      if (saved) setControlScheme(saved as any);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dots_control_scheme', controlScheme);
    }
  }, [controlScheme]);

  useEffect(() => {
    // Parse timer settings if starting a new room
    let settings = undefined;
    if (searchParams.get('timer') === '1') {
      settings = {
        timerEnabled: true,
        initialTime: parseInt(searchParams.get('time') || '300000', 10),
        increment: parseInt(searchParams.get('inc') || '3000', 10),
      };
    }

    wsService.connect(roomId);
    
    // Explicitly send join again if already connected (in case of fast navigation)
    // The service handles duplicate connects safely
    setTimeout(() => {
      wsService.send('join', { roomId, settings });
    }, 100);

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
    };
  }, [roomId, searchParams]);

  const handleCopyLink = async () => {
    const inviteUrl = window.location.href;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = inviteUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    const inviteUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dots Game Invitation',
          text: `Join my Dots game in room: ${roomId}`,
          url: inviteUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };


  const doLeaveRoom = () => {
    wsService.disconnect();
    router.push('/');
  };

  const handleLeaveClick = () => {
    setLeaveConfirmOpen(true);
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

  return (
    <div className="flex flex-col w-screen h-screen bg-background text-foreground overflow-hidden">
      {/* Top UI Bar */}
      <div className="w-full px-4 py-3 flex justify-between items-center bg-background z-10 border-b shadow-sm flex-none">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent cursor-pointer" onClick={handleLeaveClick}>
            Dots
          </h1>
          <div className="hidden sm:flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-md border text-xs font-mono">
            <span>{t("roomPrefix")} <strong>{roomId}</strong></span>
            <button
              onClick={handleCopyLink}
              title={t("copyInviteLink")}
              className="ml-1 p-1 hover:bg-background/80 rounded transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[10px] text-green-500 font-sans font-medium">{t("copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-sans">{t("copyLink")}</span>
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              title={t("shareLink")}
              className="p-1 hover:bg-background/80 rounded transition-colors text-muted-foreground hover:text-foreground"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          {gameState && (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-secondary/20 rounded-md border text-xs">
                <Swords className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono font-bold text-blue-500">{gameState.matchScoreP1 || 0}</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono font-bold text-red-500">{gameState.matchScoreP2 || 0}</span>
              </div>

              {gameState.status === 'playing' && (
                <div className="flex items-center gap-3 bg-secondary/30 px-3 py-1 rounded-full border shadow-inner">
                  {gameState.settings?.timerEnabled && <Timer gameState={gameState} player={1} />}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                    <span className="font-mono font-bold text-sm">{p1Score}</span>
                  </div>
                  <div className="w-px h-4 bg-border"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm">{p2Score}</span>
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                  </div>
                  {gameState.settings?.timerEnabled && <Timer gameState={gameState} player={2} />}
                </div>
              )}
            </div>
          )}

          {gameState && myPlayerId && (
            <div className="flex items-center gap-1">
              {gameState.status === 'playing' ? (
                <>
                  <div className="flex items-center justify-center min-w-[70px] sm:min-w-[90px]">
                    {(!gameState.undoRequestedBy || gameState.undoRequestedBy === 0) ? (
                      <button 
                        disabled={!(gameState.currentTurn !== myPlayerId && gameState.lastMove)}
                        onClick={() => wsService.send('request_undo', {})}
                        className="disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 px-2.5 py-1 bg-secondary/80 hover:bg-secondary rounded-md text-[10px] sm:text-xs font-medium border shadow-sm transition-colors text-muted-foreground hover:text-foreground w-full justify-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t("undo")}</span>
                      </button>
                    ) : gameState.undoRequestedBy === myPlayerId ? (
                      <span className="text-[10px] sm:text-xs text-muted-foreground animate-pulse border px-2 py-1 rounded-md bg-secondary/30 w-full text-center">
                        {t("waiting")}
                      </span>
                    ) : !!gameState.undoRequestedBy && gameState.undoRequestedBy !== myPlayerId ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] sm:text-xs font-bold text-destructive mr-0.5">{t("undoQuestion")}</span>
                        <button 
                          onClick={() => wsService.send('answer_undo', { accept: true })}
                          className="px-2 py-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-md text-[10px] sm:text-xs font-bold border border-green-500/30"
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => wsService.send('answer_undo', { accept: false })}
                          className="px-2 py-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-md text-[10px] sm:text-xs font-bold border border-red-500/30"
                        >
                          No
                        </button>
                      </div>
                    ) : null}
                  </div>
                  
                  <button 
                    onClick={() => setSurrenderConfirmOpen(true)}
                    className="flex items-center justify-center px-2.5 py-1 bg-secondary/80 hover:bg-destructive/20 hover:text-destructive rounded-md text-[10px] sm:text-xs font-medium border shadow-sm transition-colors text-muted-foreground"
                    title={t("surrender")}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : null}
            </div>
          )}

          <div className="hidden sm:flex items-center gap-4">
            <button onClick={() => setSettingsOpen(true)} className="p-2 mr-2 text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </button>
            {gameState && (
              <div className="text-sm font-medium flex items-center gap-2">
                {gameState.status === 'playing' ? (
                  <span className={cn(
                    "px-2.5 py-1 rounded-full border shadow-sm inline-block",
                    gameState.currentTurn === 1 
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/30" 
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  )}>
                    {t('playerTurn', { turn: gameState.currentTurn })}
                  </span>
                ) : gameState.status === 'finished' ? (
                  <span className="text-muted-foreground font-bold">{t("gameOver")}</span>
                ) : (
                  <span className="text-muted-foreground animate-pulse">
                    Waiting for opponent...
                  </span>
                )}
              </div>
            )}
            <button 
              onClick={handleLeaveClick}
              className="flex items-center gap-1 px-3 py-1 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-md text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("leave")}</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="sm:hidden relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 -mr-2 text-foreground">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium px-4 py-2 rounded-lg z-20 shadow-lg border border-destructive/50 animate-bounce">
          {error}
        </div>
      )}
      
      {settingsOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border shadow-xl rounded-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setSettingsOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> {t("settings")}</h2>
            
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">{t("controlsMobile")}</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50">
                  <input type="radio" name="controlScheme" value="direct" checked={controlScheme === 'direct'} onChange={(e) => setControlScheme(e.target.value as any)} className="mt-1" />
                  <div>
                    <div className="font-medium text-sm">{t("directTouch")}</div>
                    <div className="text-xs text-muted-foreground">{t("directTouchDesc")}</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50">
                  <input type="radio" name="controlScheme" value="drag" checked={controlScheme === 'drag'} onChange={(e) => setControlScheme(e.target.value as any)} className="mt-1" />
                  <div>
                    <div className="font-medium text-sm">{t("dragRelease")}</div>
                    <div className="text-xs text-muted-foreground">{t("dragReleaseDesc")}</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="mb-2 border-t pt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">{t('preferences')}</h3>
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t('theme')}</span>
                  <ThemeToggle />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{t('language')}</span>
                  <LanguageToggle />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {surrenderConfirmOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border shadow-xl rounded-xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setSurrenderConfirmOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-yellow-500">
              <Flag className="w-5 h-5" /> {t("surrenderConfirmTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("surrenderConfirmDesc")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSurrenderConfirmOpen(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => { wsService.send('surrender', {}); setSurrenderConfirmOpen(false); }}
                className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-600 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                {t("surrender")}
              </button>
            </div>
          </div>
        </div>
      )}

      {leaveConfirmOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border shadow-xl rounded-xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setLeaveConfirmOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-destructive">
              <LogOut className="w-5 h-5" /> {t("leaveConfirmTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("leaveConfirmDesc")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLeaveConfirmOpen(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={doLeaveRoom}
                className="px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                {t("confirmLeave")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative z-0">
        <GameBoard
          state={gameState}
          onMove={handleMove}
          controlScheme={controlScheme}
          myPlayerId={myPlayerId}
        />

        {/* Game Over Overlay */}
        {gameState?.status === 'finished' && myPlayerId && (
          <GameOverOverlay
            gameState={gameState}
            myPlayerId={myPlayerId}
            t={t}
            p1Score={p1Score}
            p2Score={p2Score}
            onRematch={() => wsService.send('request_rematch', {})}
            onLeave={doLeaveRoom}
          />
        )}

        {/* Disconnect Overlay */}
        {gameState?.status === 'playing' && (gameState.p1Disconnected || gameState.p2Disconnected) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="bg-card border shadow-xl rounded-xl p-6 text-center animate-pulse">
              <h3 className="text-xl font-bold text-destructive mb-2">{t("playerDisconnected")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {gameState.p1Disconnected ? "Player 1" : "Player 2"} has left the room.
              </p>
              {gameState.disconnectDeadline && (
                <div className="text-2xl font-mono text-primary">
                  <DisconnectCountdown deadline={gameState.disconnectDeadline} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Overlay */}
        {!gameState && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3 animate-pulse">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg font-medium text-muted-foreground">{t("connecting")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Disconnect Countdown Component ──────────────────────────────────────────

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

// ─── Game Over Overlay Component ────────────────────────────────────────────

function GameOverOverlay({
  gameState, myPlayerId, t, p1Score, p2Score, onRematch, onLeave
}: {
  gameState: import('@/lib/types').GameState;
  myPlayerId: number;
  t: (key: string) => string;
  p1Score: number;
  p2Score: number;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const iWon = gameState.winner === myPlayerId;
  const isTie = gameState.winner === 0;
  const confettiRan = useRef(false);

  useEffect(() => {
    if (iWon && !confettiRan.current) {
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
  }, [iWon]);

  const title = isTie ? t('tieTitle') : iWon ? t('winTitle') : t('loseTitle');

  const reasonKey = gameState.winReason === 'surrender'
    ? (iWon ? 'winReasonSurrenderWin' : 'winReasonSurrenderLose')
    : gameState.winReason === 'timeout'
    ? (iWon ? 'winReasonTimeoutWin' : 'winReasonTimeoutLose')
    : gameState.winReason === 'disconnect'
    ? (iWon ? 'winReasonDisconnectWin' : 'winReasonDisconnectLose')
    : 'winReasonBoardFull';

  return (
    <div className="absolute inset-0 bg-background/85 backdrop-blur-sm z-20 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card border shadow-2xl rounded-2xl w-full max-w-sm p-8 text-center animate-in zoom-in-90 duration-300">
        {/* Title + Reason */}
        <h2 className={`text-3xl font-black mb-1 ${iWon ? 'text-yellow-400' : isTie ? 'text-muted-foreground' : 'text-destructive'}`}>
          {title}
        </h2>
        <p className="text-xs text-muted-foreground mb-6">{t(reasonKey)}</p>

        {/* Round Score — captured dots */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t('scoreCaptured')}</div>
          <div className="flex items-center justify-center gap-4">
            <span className={`text-5xl font-black tabular-nums ${myPlayerId === 1 ? 'text-blue-400' : 'text-muted-foreground/50'}`}>{p1Score}</span>
            <span className="text-3xl font-light text-muted-foreground">:</span>
            <span className={`text-5xl font-black tabular-nums ${myPlayerId === 2 ? 'text-red-400' : 'text-muted-foreground/50'}`}>{p2Score}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-border my-4" />

        {/* Match Score */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t('matchScore')}</div>
          <div className="flex items-center justify-center gap-4">
            <span className="text-5xl font-black text-blue-400 tabular-nums">{gameState.matchScoreP1 ?? 0}</span>
            <span className="text-3xl font-light text-muted-foreground">:</span>
            <span className="text-5xl font-black text-red-400 tabular-nums">{gameState.matchScoreP2 ?? 0}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {!gameState.rematchRequestedBy && (
            <button
              onClick={onRematch}
              className="w-full px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-base transition-colors shadow-sm"
            >
              🔄 {t('rematch')}
            </button>
          )}
          {gameState.rematchRequestedBy === myPlayerId && (
            <span className="text-sm text-muted-foreground animate-pulse border px-4 py-3 rounded-xl bg-secondary/30">
              {t('waiting')}
            </span>
          )}
          {!!gameState.rematchRequestedBy && gameState.rematchRequestedBy !== myPlayerId && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-primary">{t('rematchQuestion')}</p>
              <div className="flex gap-3">
                <button onClick={() => wsService.send('answer_rematch', { accept: true })} className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-bold hover:bg-green-500/30 transition-colors">{t('yes')}</button>
                <button onClick={() => wsService.send('answer_rematch', { accept: false })} className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-colors">{t('no')}</button>
              </div>
            </div>
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
