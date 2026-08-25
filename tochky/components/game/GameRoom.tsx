"use client";

import { useState, useEffect, useCallback } from 'react';
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
                    onClick={() => { if(window.confirm(t('surrenderConfirm'))) wsService.send('surrender', {}) }}
                    className="flex items-center justify-center px-2.5 py-1 bg-secondary/80 hover:bg-destructive/20 hover:text-destructive rounded-md text-[10px] sm:text-xs font-medium border shadow-sm transition-colors text-muted-foreground"
                    title={t("surrender")}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : gameState.status === 'finished' ? (
                <div className="flex items-center gap-2">
                  {!gameState.rematchRequestedBy && (
                     <button onClick={() => wsService.send('request_rematch', {})} className="px-2.5 py-1 bg-primary text-primary-foreground rounded-md text-[10px] sm:text-xs font-medium border shadow-sm hover:bg-primary/80 transition-colors">{t("rematch")}</button>
                  )}
                  {gameState.rematchRequestedBy === myPlayerId && (
                     <span className="text-[10px] sm:text-xs text-muted-foreground animate-pulse border px-2 py-1 rounded-md bg-secondary/30">Waiting...</span>
                  )}
                  {!!gameState.rematchRequestedBy && gameState.rematchRequestedBy !== myPlayerId && (
                     <div className="flex items-center gap-1">
                       <span className="text-[10px] sm:text-xs font-bold text-primary mr-0.5">{t("rematchQuestion")}</span>
                       <button onClick={() => wsService.send('answer_rematch', { accept: true })} className="px-2 py-1 bg-green-500/20 text-green-500 border border-green-500/30 rounded-md text-[10px] sm:text-xs font-bold">{t("yes")}</button>
                       <button onClick={() => wsService.send('answer_rematch', { accept: false })} className="px-2 py-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded-md text-[10px] sm:text-xs font-bold">{t("no")}</button>
                     </div>
                  )}
                </div>
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
