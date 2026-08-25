package domain

import "encoding/json"

type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type PlayerInfo struct {
	ID    int    `json:"id"` // 1 or 2
	Score int    `json:"score"`
}

type RoomSettings struct {
	TimerEnabled bool  `json:"timerEnabled"`
	InitialTime  int64 `json:"initialTime"` // in ms
	Increment    int64 `json:"increment"`   // in ms
}

type MoveRecord struct {
	X      int   `json:"x"`
	Y      int   `json:"y"`
	TimeP1 int64 `json:"timeP1"`
	TimeP2 int64 `json:"timeP2"`
}

type GameState struct {
	Board           [][]int      `json:"board"`       // 0: empty, 1: player1, 2: player2
	CurrentTurn     int          `json:"currentTurn"` // 1 or 2
	CapturedP1      []Point      `json:"capturedP1"`
	CapturedP2      []Point      `json:"capturedP2"`
	PolygonsP1      [][]Point    `json:"polygonsP1"` // Array of polygons for drawing
	PolygonsP2      [][]Point    `json:"polygonsP2"`
	Status          string       `json:"status"`      // "waiting", "playing", "finished"
	Winner          int          `json:"winner,omitempty"` // 1, 2, or 0 (tie)
	WinReason       string       `json:"winReason,omitempty"` // "timeout", "surrender", "board_full"

	LastMove        *Point       `json:"lastMove,omitempty"`
	UndoRequestedBy int          `json:"undoRequestedBy,omitempty"`
	MovesHistory    []MoveRecord `json:"-"`

	// Series tracking
	MatchScoreP1       int `json:"matchScoreP1"`
	MatchScoreP2       int `json:"matchScoreP2"`
	StartingPlayer     int `json:"startingPlayer"`
	RematchRequestedBy int `json:"rematchRequestedBy,omitempty"`

	// Disconnect tracking
	P1Disconnected     bool  `json:"p1Disconnected"`
	P2Disconnected     bool  `json:"p2Disconnected"`
	DisconnectDeadline int64 `json:"disconnectDeadline,omitempty"`

	// Timer tracking
	Settings     RoomSettings `json:"settings"`
	TimeP1       int64        `json:"timeP1"`       // ms remaining
	TimeP2       int64        `json:"timeP2"`       // ms remaining
	LastMoveTime int64        `json:"lastMoveTime"` // Unix timestamp ms
}

type Message struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type MovePayload struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type JoinPayload struct {
	RoomID    string       `json:"roomId"`
	SessionID string       `json:"sessionId"`
	Settings  RoomSettings `json:"settings"`
}

type WelcomePayload struct {
	PlayerID int `json:"playerId"`
}

type UndoAnswerPayload struct {
	Accept bool `json:"accept"`
}
