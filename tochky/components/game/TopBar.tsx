"use client";
import { cn } from '@/lib/utils';
import { LogOut, Menu, RotateCcw, Flag, Settings, X, Swords, SkipForward } from 'lucide-react';
import { Timer } from './Timer';
import { GameState } from '@/lib/types';
import { GAME_STATUS } from '@/lib/constants';

interface TopBarProps {
  gameState: GameState | null;
  myPlayerId: number | null;
  p1Score: number;
  p2Score: number;
  handleLeaveClick: () => void;
  handlePassClick: () => void;
  setSurrenderConfirmOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  t: (key: string, values?: Record<string, any>) => string;
  wsService: any;
}

export function TopBar({
  gameState,
  myPlayerId,
  p1Score,
  p2Score,
  handleLeaveClick,
  handlePassClick,
  setSurrenderConfirmOpen,
  setSettingsOpen,
  menuOpen,
  setMenuOpen,
  t,
  wsService
}: TopBarProps) {
  const isPlaying = gameState?.status === GAME_STATUS.PLAYING;
  const isFinished = gameState?.status === GAME_STATUS.FINISHED;
  const isLocal = gameState?.settings?.isLocal;
  const isMyTurn = gameState?.currentTurn === myPlayerId;
  const isActiveTurnDisplay = isLocal || isMyTurn;
  const turnPlayerColor = gameState?.currentTurn === 1 ? "blue" : "red";
  
  const getTurnClasses = () => {
    if (!isActiveTurnDisplay) return "bg-secondary/30 text-muted-foreground border-transparent opacity-70";
    return turnPlayerColor === "blue" 
      ? "bg-blue-500/10 text-blue-500 border-blue-500/30" 
      : "bg-red-500/10 text-red-500 border-red-500/30";
  };

  const getTurnText = () => {
    if (isLocal) return t('playerTurn', { turn: gameState?.currentTurn });
    return isMyTurn ? t('yourTurn') : t('opponentTurn');
  };

  return (
    <div className="w-full px-4 py-3 flex justify-between items-center bg-background z-10 border-b shadow-sm flex-none">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent cursor-pointer" onClick={handleLeaveClick}>
          Dots
        </h1>
        {gameState && myPlayerId && (
          <div className="hidden sm:flex text-sm font-medium items-center gap-2 border-l pl-3 ml-1 border-border/50 h-6">
            {isPlaying ? (
              <span className={cn("px-3 py-1 rounded-full border shadow-sm flex items-center gap-2", getTurnClasses())}>
                {isActiveTurnDisplay && (
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", turnPlayerColor === "blue" ? "bg-blue-500" : "bg-red-500")} />
                )}
                {getTurnText()}
              </span>
            ) : isFinished ? (
              <span className="text-muted-foreground font-bold">{t("gameOver")}</span>
            ) : null}
          </div>
        )}
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

            {gameState.status === GAME_STATUS.PLAYING && (
              <div className="flex items-center gap-3 bg-secondary/30 px-3 py-1 rounded-full border shadow-inner">
                <div className={cn("transition-opacity", gameState.currentTurn === 1 ? "opacity-100" : "opacity-40")}>
                  {gameState.settings?.timerEnabled && <Timer gameState={gameState} player={1} />}
                </div>
                <div className={cn("flex items-center gap-1.5 transition-opacity", gameState.currentTurn === 1 ? "opacity-100" : "opacity-40")}>
                  <div className={cn("w-2 h-2 rounded-full bg-blue-500", gameState.currentTurn === 1 && "shadow-[0_0_5px_rgba(59,130,246,0.8)]")}></div>
                  <span className="font-mono font-bold text-sm">
                    {p1Score}
                    {gameState.settings?.winCondition === 'target_score' && !!gameState.settings.targetScore && (
                      <span className="text-[10px] text-muted-foreground font-normal">/{gameState.settings.targetScore}</span>
                    )}
                  </span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div className={cn("flex items-center gap-1.5 transition-opacity", gameState.currentTurn === 2 ? "opacity-100" : "opacity-40")}>
                  <span className="font-mono font-bold text-sm">
                    {p2Score}
                    {gameState.settings?.winCondition === 'target_score' && !!gameState.settings.targetScore && (
                      <span className="text-[10px] text-muted-foreground font-normal">/{gameState.settings.targetScore}</span>
                    )}
                  </span>
                  <div className={cn("w-2 h-2 rounded-full bg-red-500", gameState.currentTurn === 2 && "shadow-[0_0_5px_rgba(239,68,68,0.8)]")}></div>
                </div>
                <div className={cn("transition-opacity", gameState.currentTurn === 2 ? "opacity-100" : "opacity-40")}>
                  {gameState.settings?.timerEnabled && <Timer gameState={gameState} player={2} />}
                </div>
              </div>
            )}
          </div>
        )}

        {gameState && myPlayerId && (
          <div className="hidden sm:flex items-center gap-1">
            {gameState.status === GAME_STATUS.PLAYING ? (
              <>
                <button
                  disabled={!isActiveTurnDisplay}
                  onClick={handlePassClick}
                  className="disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1 px-2.5 py-1 bg-secondary/80 hover:bg-secondary rounded-md text-[10px] sm:text-xs font-medium border shadow-sm transition-colors text-muted-foreground hover:text-foreground"
                  title={t("pass")}
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("pass")}</span>
                </button>

                <div className="flex items-center justify-center min-w-[70px] sm:min-w-[90px]">
                  {(!gameState.undoRequestedBy || gameState.undoRequestedBy === 0) ? (
                    <button 
                      disabled={!gameState.lastMove || (!gameState.settings?.isLocal && gameState.currentTurn === myPlayerId)}
                      onClick={() => wsService.send('request_undo', {})}
                      className="disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 px-2.5 py-1 bg-secondary/80 hover:bg-secondary rounded-md text-[10px] sm:text-xs font-medium border shadow-sm transition-colors text-muted-foreground hover:text-foreground w-full justify-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t("undo")}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] sm:text-xs text-muted-foreground animate-pulse border px-2 py-1 rounded-md bg-secondary/30 w-full text-center">
                      {t("waiting")}
                    </span>
                  )}
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
          <button onClick={() => setSettingsOpen(true)} className="p-2 text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </button>
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
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {menuOpen && gameState && (
            <div className="absolute top-12 right-0 bg-background border shadow-lg rounded-xl flex flex-col min-w-[200px] p-2 gap-1 z-50">
              <div className="flex items-center justify-between px-3 py-2 text-sm font-medium border-b mb-1">
                <span className="text-muted-foreground font-semibold uppercase text-xs tracking-wider">{t("matchScore")}</span>
                <div className="flex items-center gap-1 text-base">
                  <span className="text-blue-500 font-bold">{gameState.matchScoreP1 || 0}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-red-500 font-bold">{gameState.matchScoreP2 || 0}</span>
                </div>
              </div>

              {gameState.status === GAME_STATUS.PLAYING && (
                <>
                  <button 
                    disabled={!isActiveTurnDisplay}
                    onClick={() => { handlePassClick(); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors w-full text-left font-medium disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <SkipForward className="w-4 h-4 text-muted-foreground" /> {t("pass")}
                  </button>

                  {(!gameState.undoRequestedBy || gameState.undoRequestedBy === 0) ? (
                    <button 
                      disabled={!gameState.lastMove || (!gameState.settings?.isLocal && gameState.currentTurn === myPlayerId)}
                      onClick={() => { wsService.send('request_undo', {}); setMenuOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors w-full text-left font-medium disabled:opacity-40"
                    >
                      <RotateCcw className="w-4 h-4 text-muted-foreground" /> {t("undo")}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground w-full text-left font-medium animate-pulse">
                      <RotateCcw className="w-4 h-4" /> {t("waiting")}
                    </div>
                  )}
                  
                  <button 
                    onClick={() => { setSurrenderConfirmOpen(true); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full text-left font-medium"
                  >
                    <Flag className="w-4 h-4" /> {t("surrender")}
                  </button>
                  <div className="h-px bg-border my-1" />
                </>
              )}

              <button 
                onClick={() => { setSettingsOpen(true); setMenuOpen(false); }} 
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors w-full text-left font-medium"
              >
                <Settings className="w-4 h-4 text-muted-foreground" /> {t("settings")}
              </button>
              <button 
                onClick={() => { handleLeaveClick(); setMenuOpen(false); }} 
                className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full text-left font-medium"
              >
                <LogOut className="w-4 h-4" /> {t("leave")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
