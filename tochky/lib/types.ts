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
  status: string;
  winner?: number;
  winReason?: string;
  lastMove?: Point;
  undoRequestedBy?: number;

  matchScoreP1: number;
  matchScoreP2: number;
  startingPlayer: number;
  rematchRequestedBy?: number;

  settings: RoomSettings;
  timeP1: number;
  timeP2: number;
  lastMoveTime: number;
}
