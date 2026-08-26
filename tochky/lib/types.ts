import { GameStatusType, WinReasonType } from './constants';

export interface Point {
  x: number;
  y: number;
}

export interface RoomSettings {
  timerEnabled: boolean;
  initialTime: number;
  increment: number;
}

export interface GameState {
  board: number[][];
  currentTurn: number;
  capturedP1: Point[];
  capturedP2: Point[];
  polygonsP1: Point[][];
  polygonsP2: Point[][];
  status: GameStatusType;
  winner?: number;
  winReason?: WinReasonType;
  lastMove?: Point;
  undoRequestedBy?: number;

  matchScoreP1: number;
  matchScoreP2?: number;
  startingPlayer?: number;
  rematchRequestedBy?: number;

  // Disconnect info
  p1Disconnected?: boolean;
  p2Disconnected?: boolean;
  disconnectDeadline?: number;

  settings: RoomSettings;
  timeP1: number;
  timeP2: number;
  lastMoveTime: number;
}
