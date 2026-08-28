"use client";

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { 
  GameModeType, 
  GAME_MODE, 
  TimerModeType, 
  TIMER_MODE, 
  DEFAULT_TIMER, 
  DEFAULT_BOARD_SIZE,
  STORAGE_KEYS,
  BOARD_SIZES,
  WinConditionType,
  WIN_CONDITION,
  DEFAULT_TARGET_SCORE
} from "@/lib/constants"

type BoardSizeType = typeof BOARD_SIZES[number]

interface LobbyState {
  gameMode: GameModeType
  timerEnabled: boolean
  timerMode: TimerModeType
  initialTimeMins: number
  initialTimeSecs: number
  incrementSecs: number
  boardSize: BoardSizeType
  winCondition: WinConditionType
  targetScore: number

  setGameMode: (mode: GameModeType) => void
  setTimerEnabled: (enabled: boolean) => void
  setTimerMode: (mode: TimerModeType) => void
  setInitialTimeMins: (mins: number) => void
  setInitialTimeSecs: (secs: number) => void
  setIncrementSecs: (secs: number) => void
  setBoardSize: (size: BoardSizeType) => void
  setWinCondition: (condition: WinConditionType) => void
  setTargetScore: (score: number) => void
}

export const useLobbyStore = create<LobbyState>()(
  persist(
    (set) => ({
      gameMode: GAME_MODE.ONLINE,
      timerEnabled: false,
      timerMode: TIMER_MODE.GAME,
      initialTimeMins: DEFAULT_TIMER.GAME.MINUTES,
      initialTimeSecs: DEFAULT_TIMER.GAME.SECONDS,
      incrementSecs: DEFAULT_TIMER.GAME.INCREMENT,
      boardSize: DEFAULT_BOARD_SIZE,
      winCondition: WIN_CONDITION.FULL_BOARD,
      targetScore: DEFAULT_TARGET_SCORE,

      setGameMode: (mode) => set({ gameMode: mode }),
      setTimerEnabled: (enabled) => set({ timerEnabled: enabled }),
      setTimerMode: (mode) => set({ timerMode: mode }),
      setInitialTimeMins: (mins) => set({ initialTimeMins: Math.max(0, isNaN(mins) ? 0 : mins) }),
      setInitialTimeSecs: (secs) => set({ initialTimeSecs: Math.max(0, isNaN(secs) ? 0 : secs) }),
      setIncrementSecs: (secs) => set({ incrementSecs: Math.max(0, isNaN(secs) ? 0 : secs) }),
      setBoardSize: (size) => set({ boardSize: BOARD_SIZES.includes(size) ? size : DEFAULT_BOARD_SIZE }),
      setWinCondition: (condition) => set({ winCondition: condition }),
      setTargetScore: (score) => set({ targetScore: Math.max(1, isNaN(score) ? DEFAULT_TARGET_SCORE : score) }),
    }),
    {
      name: STORAGE_KEYS.LOBBY_SETTINGS,
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            initialTimeMins: Math.max(0, isNaN(Number(persistedState?.initialTimeMins)) ? DEFAULT_TIMER.GAME.MINUTES : Number(persistedState?.initialTimeMins)),
            initialTimeSecs: Math.max(0, isNaN(Number(persistedState?.initialTimeSecs)) ? DEFAULT_TIMER.GAME.SECONDS : Number(persistedState?.initialTimeSecs)),
            incrementSecs: Math.max(0, isNaN(Number(persistedState?.incrementSecs)) ? DEFAULT_TIMER.GAME.INCREMENT : Number(persistedState?.incrementSecs)),
            boardSize: BOARD_SIZES.includes(persistedState?.boardSize) ? persistedState.boardSize : DEFAULT_BOARD_SIZE,
            winCondition: persistedState?.winCondition === WIN_CONDITION.TARGET_SCORE ? WIN_CONDITION.TARGET_SCORE : WIN_CONDITION.FULL_BOARD,
            targetScore: Math.max(1, isNaN(Number(persistedState?.targetScore)) ? DEFAULT_TARGET_SCORE : Number(persistedState?.targetScore)),
          };
        }
        return persistedState;
      },
    }
  )
)
