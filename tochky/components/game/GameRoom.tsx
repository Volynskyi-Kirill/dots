"use client";
import { GAME_STATUS, WIN_REASON, CONTROL_SCHEME, ControlSchemeType, STORAGE_KEYS } from '@/lib/constants';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { wsService } from '@/lib/websocket';
import { GameBoard } from './GameBoard';
import { TopBar } from './TopBar';
import { useGameRoom } from '@/hooks/useGameRoom';
import { useGameSounds } from '@/hooks/useGameSounds';
import { GameOverOverlay } from './overlays/GameOverOverlay';
import { SettingsModal } from './overlays/SettingsModal';
import { ConfirmModal } from './overlays/ConfirmModal';
import { UndoRequestOverlay } from './overlays/UndoRequestOverlay';
import { DisconnectOverlay } from './overlays/DisconnectOverlay';
import { WaitingOverlay } from './overlays/WaitingOverlay';
import { Flag, LogOut } from 'lucide-react';

export function GameRoom({ roomId }: { roomId: string }) {
  const t = useTranslations('GameRoom');
  
  const {
    gameState,
    error,
    myPlayerId,
    p1Score,
    p2Score,
    doLeaveRoom,
    handleMove
  } = useGameRoom(roomId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [surrenderConfirmOpen, setSurrenderConfirmOpen] = useState(false);
  const [controlScheme, setControlScheme] = useState<ControlSchemeType>(CONTROL_SCHEME.DIRECT);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedScheme = localStorage.getItem(STORAGE_KEYS.CONTROL_SCHEME);
      if (savedScheme) setControlScheme(savedScheme as ControlSchemeType);
      
      const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      if (savedSound !== null) setSoundEnabled(savedSound === 'true');

      const savedVolume = localStorage.getItem(STORAGE_KEYS.SOUND_VOLUME);
      if (savedVolume !== null) {
        setSoundVolume(parseFloat(savedVolume));
      } else {
        setSoundVolume(0.5); // Default to half volume if not set
      }
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CONTROL_SCHEME, controlScheme);
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(soundEnabled));
      localStorage.setItem(STORAGE_KEYS.SOUND_VOLUME, String(soundVolume));
    }
  }, [controlScheme, soundEnabled, soundVolume, isInitialized]);

  useGameSounds(gameState, myPlayerId, soundEnabled, soundVolume);

  return (
    <div className="flex flex-col w-screen h-screen bg-background text-foreground overflow-hidden">
      <TopBar
        gameState={gameState}
        myPlayerId={myPlayerId}
        p1Score={p1Score}
        p2Score={p2Score}
        handleLeaveClick={() => setLeaveConfirmOpen(true)}
        setSurrenderConfirmOpen={setSurrenderConfirmOpen}
        setSettingsOpen={setSettingsOpen}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        t={t}
        wsService={wsService}
      />

      {error && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium px-4 py-2 rounded-lg z-20 shadow-lg border border-destructive/50 animate-bounce">
          {error}
        </div>
      )}
      
      {settingsOpen && (
        <SettingsModal 
          onClose={() => setSettingsOpen(false)} 
          controlScheme={controlScheme} 
          setControlScheme={setControlScheme} 
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          soundVolume={soundVolume}
          setSoundVolume={setSoundVolume}
          t={t} 
        />
      )}
      
      <ConfirmModal
        isOpen={surrenderConfirmOpen}
        onClose={() => setSurrenderConfirmOpen(false)}
        onConfirm={() => { wsService.send('surrender', {}); setSurrenderConfirmOpen(false); }}
        title={t("surrenderConfirmTitle")}
        description={t("surrenderConfirmDesc")}
        confirmText={t("surrender")}
        cancelText={t("cancel")}
        icon={<Flag className="w-5 h-5" />}
        confirmButtonClass="bg-yellow-500 hover:bg-yellow-600"
      />

      <ConfirmModal
        isOpen={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={doLeaveRoom}
        title={t("leaveConfirmTitle")}
        description={t("leaveConfirmDesc")}
        confirmText={t("confirmLeave")}
        cancelText={t("cancel")}
        icon={<LogOut className="w-5 h-5 text-destructive" />}
        confirmButtonClass="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
      />

      {gameState?.status === GAME_STATUS.PLAYING && !!gameState.undoRequestedBy && (gameState.settings?.isLocal || gameState.undoRequestedBy !== myPlayerId) && (
        <UndoRequestOverlay t={t} />
      )}

      <div className="flex-1 relative z-0">
        <GameBoard
          state={gameState}
          onMove={handleMove}
          controlScheme={controlScheme}
          myPlayerId={myPlayerId}
        />

        {gameState?.status === GAME_STATUS.FINISHED && myPlayerId && (
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

        {gameState?.status === GAME_STATUS.PLAYING && (gameState.p1Disconnected || gameState.p2Disconnected) && (
          <DisconnectOverlay gameState={gameState} t={t} />
        )}

        {gameState?.status === GAME_STATUS.WAITING && (
          <WaitingOverlay roomId={roomId} doLeaveRoom={doLeaveRoom} t={t} />
        )}

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
