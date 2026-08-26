export const GAME_STATUS = {
  PLAYING: 'playing',
  FINISHED: 'finished',
  WAITING: 'waiting',
} as const;

export const WIN_REASON = {
  SURRENDER: 'surrender',
  TIMEOUT: 'timeout',
  DISCONNECT: 'disconnect',
  BOARD_FULL: 'boardFull',
} as const;

export const CONTROL_SCHEME = {
  DIRECT: 'direct',
  DRAG: 'drag',
  CONFIRM: 'confirm',
} as const;

export type GameStatusType = typeof GAME_STATUS[keyof typeof GAME_STATUS];
export type WinReasonType = typeof WIN_REASON[keyof typeof WIN_REASON];
export type ControlSchemeType = typeof CONTROL_SCHEME[keyof typeof CONTROL_SCHEME];
