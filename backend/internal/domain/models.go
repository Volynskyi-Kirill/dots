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

type GameState struct {
	Board       [][]int `json:"board"`       // 0: empty, 1: player1, 2: player2
	CurrentTurn int     `json:"currentTurn"` // 1 or 2
	CapturedP1  []Point `json:"capturedP1"`
	CapturedP2  []Point `json:"capturedP2"`
	PolygonsP1  [][]Point `json:"polygonsP1"` // Array of polygons for drawing
	PolygonsP2  [][]Point `json:"polygonsP2"`
	Status          string    `json:"status"`      // "waiting", "playing", "finished"
	LastMove        *Point    `json:"lastMove,omitempty"`
	UndoRequestedBy int       `json:"undoRequestedBy,omitempty"`
	MovesHistory    []Point   `json:"-"`
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
	RoomID    string `json:"roomId"`
	SessionID string `json:"sessionId"`
}

type WelcomePayload struct {
	PlayerID int `json:"playerId"`
}

type UndoAnswerPayload struct {
	Accept bool `json:"accept"`
}
