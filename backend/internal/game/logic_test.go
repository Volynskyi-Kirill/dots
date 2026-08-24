package game

import (
	"testing"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
)

func TestMakeMove_ValidMove(t *testing.T) {
	logic := NewGameLogic(5, 5)
	state := createEmptyState(5, 5)

	err := logic.MakeMove(state, constants.Player1, 2, 2)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if state.Board[2][2] != constants.Player1 {
		t.Errorf("expected dot to be placed")
	}
	if state.CurrentTurn != constants.Player2 {
		t.Errorf("expected turn to switch")
	}
}

func TestMakeMove_Capture(t *testing.T) {
	logic := NewGameLogic(5, 5)
	state := createEmptyState(5, 5)

	// P1 forms a square around (2,2)
	// P1: (2,1), (3,2), (2,3), (1,2)
	// P2: (2,2) inside

	// Set up the board (simulate previous moves)
	state.Board[1][2] = constants.Player1
	state.Board[2][3] = constants.Player1
	state.Board[3][2] = constants.Player1

	state.Board[2][2] = constants.Player2 // Enemy inside

	// P1 makes the winning move to close the loop
	err := logic.MakeMove(state, constants.Player1, 1, 2)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(state.CapturedP1) == 0 {
		t.Fatalf("expected P1 to capture an area")
	}

	// The captured area should contain (2,2)
	captured := false
	for _, p := range state.CapturedP1 {
		if p.X == 2 && p.Y == 2 {
			captured = true
			break
		}
	}
	if !captured {
		t.Errorf("expected point (2,2) to be captured")
	}
	
	// Polygons should be formed
	if len(state.PolygonsP1) != 1 {
		t.Fatalf("expected 1 polygon to be formed")
	}
}

func TestMakeMove_NoCaptureIfNoEnemy(t *testing.T) {
	logic := NewGameLogic(5, 5)
	state := createEmptyState(5, 5)

	// P1 forms a square around (2,2) but it's EMPTY
	state.Board[1][2] = constants.Player1
	state.Board[2][3] = constants.Player1
	state.Board[3][2] = constants.Player1

	// P1 makes the winning move to close the loop
	err := logic.MakeMove(state, constants.Player1, 1, 2)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(state.CapturedP1) != 0 {
		t.Fatalf("expected P1 NOT to capture an empty area (classic rules)")
	}
}

func createEmptyState(w, h int) *domain.GameState {
	board := make([][]int, h)
	for i := range board {
		board[i] = make([]int, w)
	}
	return &domain.GameState{
		Board:       board,
		CurrentTurn: constants.Player1,
		Status:      "playing",
	}
}
