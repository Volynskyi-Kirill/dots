export const STORAGE_KEYS = {
  SESSION_ID: 'dots_session_id',
  CONTROL_SCHEME: 'dots_control_scheme',
  SOUND_ENABLED: 'dots_sound_enabled',
  SOUND_VOLUME: 'dots_sound_volume',
  LOBBY_SETTINGS: 'dots_lobby_settings',
} as const

export const GAME_STATUS = {
  PLAYING: "playing",
  FINISHED: "finished",
  WAITING: "waiting",
} as const

export const WIN_REASON = {
  SURRENDER: "surrender",
  TIMEOUT: "timeout",
  DISCONNECT: "disconnect",
  BOARD_FULL: "boardFull",
  CONSECUTIVE_PASSES: "consecutive_passes",
  TARGET_SCORE: "target_score",
} as const

export const WIN_CONDITION = {
  FULL_BOARD: "full_board",
  TARGET_SCORE: "target_score",
} as const
export const DEFAULT_TARGET_SCORE = 20
export type WinConditionType = (typeof WIN_CONDITION)[keyof typeof WIN_CONDITION]

export const CONTROL_SCHEME = {
  DIRECT: "direct",
  DRAG: "drag",
  CONFIRM: "confirm",
} as const

export const BOARD_SIZES = [
  "20x20",
  "20x30",
  "30x30",
  "39x32",
  "39x39",
] as const
export const DEFAULT_BOARD_WIDTH = 20
export const DEFAULT_BOARD_HEIGHT = 20
export const DEFAULT_BOARD_SIZE =
  `${DEFAULT_BOARD_WIDTH}x${DEFAULT_BOARD_HEIGHT}` as const

export const GAME_MODE = {
  ONLINE: "online",
  LOCAL: "local",
} as const

export const DEFAULT_TIMER = {
  GAME: {
    MINUTES: 5,
    SECONDS: 0,
    INCREMENT: 3,
  },
  MOVE: {
    MINUTES: 0,
    SECONDS: 30,
    INCREMENT: 0,
  }
} as const

export const TIMER_MODE = {
  GAME: "game",
  MOVE: "move",
} as const
export type TimerModeType = (typeof TIMER_MODE)[keyof typeof TIMER_MODE]
export type GameModeType = (typeof GAME_MODE)[keyof typeof GAME_MODE]

export type GameStatusType = (typeof GAME_STATUS)[keyof typeof GAME_STATUS]
export type WinReasonType = (typeof WIN_REASON)[keyof typeof WIN_REASON]
export type ControlSchemeType =
  (typeof CONTROL_SCHEME)[keyof typeof CONTROL_SCHEME]
