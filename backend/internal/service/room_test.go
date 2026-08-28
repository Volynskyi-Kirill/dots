package service

import (
	"testing"
	"time"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
	"github.com/dots-game/backend/internal/game"
)

func TestRoom_TimerMode_Game(t *testing.T) {
	r := &Room{
		ID:         "test",
		Logic:      game.NewGameLogic(),
		Clients:    make(map[Client]int),
		Broadcast:  make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		TimerEnabled: true,
		TimerMode:    "game",
		InitialTime:  60000,
		Increment:    1000,
		BoardWidth:   10,
		BoardHeight:  10,
	}

	r.InitState(settings, 10, 10)
	r.State.Status = constants.StatusPlaying
	r.State.CurrentTurn = 1
	r.State.StartingPlayer = 1
	
	// Fast forward 5 seconds
	r.State.LastMoveTime = time.Now().UnixMilli() - 5000
	
	err := r.MakeMove(constants.Player1, 6, 6)
	if err != nil {
		t.Fatalf("MakeMove failed: %v", err)
	}

	// 60000 - 5000 + 1000 = 56000 (roughly, depends on execution time)
	if r.State.TimeP1 > 56500 || r.State.TimeP1 < 54000 {
		t.Errorf("Expected TimeP1 to be around 56000, got %d", r.State.TimeP1)
	}
}

func TestRoom_TimerMode_Move(t *testing.T) {
	r := &Room{
		ID:         "test",
		Logic:      game.NewGameLogic(),
		Clients:    make(map[Client]int),
		Broadcast:  make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		TimerEnabled: true,
		TimerMode:    "move",
		InitialTime:  60000,
		Increment:    1000,
		BoardWidth:   10,
		BoardHeight:  10,
	}

	r.InitState(settings, 10, 10)
	r.State.Status = constants.StatusPlaying
	r.State.CurrentTurn = 1
	r.State.StartingPlayer = 1
	
	// Fast forward 5 seconds
	r.State.LastMoveTime = time.Now().UnixMilli() - 5000
	
	err := r.MakeMove(constants.Player1, 6, 6)
	if err != nil {
		t.Fatalf("MakeMove failed: %v", err)
	}

	// 60000 + 1000 = 61000
	if r.State.TimeP1 != 61000 {
		t.Errorf("Expected TimeP1 to be exactly 61000, got %d", r.State.TimeP1)
	}
}

func TestRoom_PassTurn(t *testing.T) {
	r := &Room{
		ID:        "test-pass",
		Logic:     game.NewGameLogic(),
		Clients:   make(map[Client]int),
		Broadcast: make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		BoardWidth:  10,
		BoardHeight: 10,
	}

	r.InitState(settings, 10, 10)
	r.State.Status = constants.StatusPlaying
	r.State.CurrentTurn = constants.Player1

	// Validation: Player 2 cannot pass on Player 1's turn
	err := r.PassTurn(constants.Player2)
	if err == nil {
		t.Fatalf("expected error when passing out of turn, got nil")
	}

	// Player 1 passes
	err = r.PassTurn(constants.Player1)
	if err != nil {
		t.Fatalf("PassTurn P1 failed: %v", err)
	}

	if r.State.ConsecutivePasses != 1 {
		t.Errorf("expected ConsecutivePasses=1, got %d", r.State.ConsecutivePasses)
	}
	if r.State.CurrentTurn != constants.Player2 {
		t.Errorf("expected CurrentTurn=Player2, got %d", r.State.CurrentTurn)
	}
	if r.State.Status != constants.StatusPlaying {
		t.Errorf("expected Status=StatusPlaying, got %s", r.State.Status)
	}

	// Player 2 passes -> Two passes endgame condition
	err = r.PassTurn(constants.Player2)
	if err != nil {
		t.Fatalf("PassTurn P2 failed: %v", err)
	}

	if r.State.ConsecutivePasses != 2 {
		t.Errorf("expected ConsecutivePasses=2, got %d", r.State.ConsecutivePasses)
	}
	if r.State.Status != constants.StatusFinished {
		t.Errorf("expected Status=StatusFinished, got %s", r.State.Status)
	}
	if r.State.WinReason != constants.ReasonConsecutivePasses {
		t.Errorf("expected WinReason=ReasonConsecutivePasses, got %s", r.State.WinReason)
	}
	if r.State.Winner != 0 {
		t.Errorf("expected tie (Winner=0) with no captures, got %d", r.State.Winner)
	}
}

func TestRoom_PassTurn_ResetOnMove(t *testing.T) {
	r := &Room{
		ID:        "test-pass-reset",
		Logic:     game.NewGameLogic(),
		Clients:   make(map[Client]int),
		Broadcast: make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		BoardWidth:  10,
		BoardHeight: 10,
	}

	r.InitState(settings, 10, 10)
	r.State.Status = constants.StatusPlaying
	r.State.CurrentTurn = constants.Player1

	// P1 passes
	if err := r.PassTurn(constants.Player1); err != nil {
		t.Fatalf("PassTurn P1 failed: %v", err)
	}
	if r.State.ConsecutivePasses != 1 {
		t.Errorf("expected ConsecutivePasses=1, got %d", r.State.ConsecutivePasses)
	}

	// P2 makes a move -> should reset ConsecutivePasses to 0
	if err := r.MakeMove(constants.Player2, 0, 0); err != nil {
		t.Fatalf("MakeMove P2 failed: %v", err)
	}
	if r.State.ConsecutivePasses != 0 {
		t.Errorf("expected ConsecutivePasses=0 after move, got %d", r.State.ConsecutivePasses)
	}
	if r.State.CurrentTurn != constants.Player1 {
		t.Errorf("expected CurrentTurn=Player1, got %d", r.State.CurrentTurn)
	}

	// P1 passes again -> should become 1, NOT 2 (game shouldn't end)
	if err := r.PassTurn(constants.Player1); err != nil {
		t.Fatalf("PassTurn P1 failed: %v", err)
	}
	if r.State.ConsecutivePasses != 1 {
		t.Errorf("expected ConsecutivePasses=1, got %d", r.State.ConsecutivePasses)
	}
	if r.State.Status != constants.StatusPlaying {
		t.Errorf("expected Status=StatusPlaying, got %s", r.State.Status)
	}
}

func TestRoom_PassTurn_ScoringWinner(t *testing.T) {
	r := &Room{
		ID:        "test-pass-score",
		Logic:     game.NewGameLogic(),
		Clients:   make(map[Client]int),
		Broadcast: make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		BoardWidth:  10,
		BoardHeight: 10,
	}

	r.InitState(settings, 10, 10)
	r.State.Status = constants.StatusPlaying
	r.State.CurrentTurn = constants.Player1

	// Setup a captured enemy dot for P1
	r.State.Board[1][1] = constants.Player2 // enemy dot
	r.State.CapturedP1 = []domain.Point{{X: 1, Y: 1}}

	// P1 passes
	if err := r.PassTurn(constants.Player1); err != nil {
		t.Fatalf("P1 pass failed: %v", err)
	}
	// P2 passes
	if err := r.PassTurn(constants.Player2); err != nil {
		t.Fatalf("P2 pass failed: %v", err)
	}

	if r.State.Status != constants.StatusFinished {
		t.Fatalf("expected StatusFinished, got %s", r.State.Status)
	}
	if r.State.Winner != constants.Player1 {
		t.Errorf("expected Winner=Player1, got %d", r.State.Winner)
	}
	if r.State.MatchScoreP1 != 1 {
		t.Errorf("expected MatchScoreP1=1, got %d", r.State.MatchScoreP1)
	}
}

func TestRoom_PassTurn_LocalMode(t *testing.T) {
	r := &Room{
		ID:        "test-pass-local",
		Logic:     game.NewGameLogic(),
		Clients:   make(map[Client]int),
		Broadcast: make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		BoardWidth:  10,
		BoardHeight: 10,
		IsLocal:     true,
	}

	r.InitState(settings, 10, 10)
	r.State.Status = constants.StatusPlaying
	r.State.CurrentTurn = constants.Player1

	// Client 1 (representing both in hotseat) passes Player 1 turn
	if err := r.PassTurn(1); err != nil {
		t.Fatalf("Local PassTurn 1 failed: %v", err)
	}
	if r.State.CurrentTurn != constants.Player2 {
		t.Errorf("expected CurrentTurn=Player2, got %d", r.State.CurrentTurn)
	}

	// Client 1 passes Player 2 turn
	if err := r.PassTurn(1); err != nil {
		t.Fatalf("Local PassTurn 2 failed: %v", err)
	}
	if r.State.Status != constants.StatusFinished {
		t.Errorf("expected StatusFinished, got %s", r.State.Status)
	}
	if r.State.WinReason != constants.ReasonConsecutivePasses {
		t.Errorf("expected ReasonConsecutivePasses, got %s", r.State.WinReason)
	}
}

func TestRoom_TargetScore_Win(t *testing.T) {
	r := &Room{
		ID:        "test-target-score",
		Logic:     game.NewGameLogic(),
		Clients:   make(map[Client]int),
		Broadcast: make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		BoardWidth:   10,
		BoardHeight:  10,
		WinCondition: constants.WinConditionTargetScore,
		TargetScore:  1,
	}

	r.InitState(settings, 10, 10)
	r.State.Status = constants.StatusPlaying
	r.State.CurrentTurn = constants.Player1

	// Setup a small enclosure scenario:
	// P1 surrounds enemy dot at (x=1, y=1)
	r.State.Board[1][1] = constants.Player2 // enemy dot
	r.State.Board[1][0] = constants.Player1 // left (x=0, y=1)
	r.State.Board[2][1] = constants.Player1 // bottom (x=1, y=2)
	r.State.Board[1][2] = constants.Player1 // right (x=2, y=1)

	// P1 places dot at top (x=1, y=0) to close the enclosure
	err := r.MakeMove(constants.Player1, 1, 0)
	if err != nil {
		t.Fatalf("MakeMove failed: %v", err)
	}

	if r.State.Status != constants.StatusFinished {
		t.Fatalf("expected game to finish upon reaching target score, got %s", r.State.Status)
	}
	if r.State.WinReason != constants.ReasonTargetScore {
		t.Errorf("expected winReason=%s, got %s", constants.ReasonTargetScore, r.State.WinReason)
	}
	if r.State.Winner != constants.Player1 {
		t.Errorf("expected Winner=Player1, got %d", r.State.Winner)
	}
	if r.State.MatchScoreP1 != 1 {
		t.Errorf("expected MatchScoreP1=1, got %d", r.State.MatchScoreP1)
	}
}

func TestRoom_TargetScore_DefaultValidation(t *testing.T) {
	r := &Room{
		ID:        "test-target-score-val",
		Logic:     game.NewGameLogic(),
		Clients:   make(map[Client]int),
		Broadcast: make(chan []byte, 100),
	}

	settings := domain.RoomSettings{
		BoardWidth:   10,
		BoardHeight:  10,
		WinCondition: constants.WinConditionTargetScore,
		TargetScore:  -5,
	}

	r.InitState(settings, 10, 10)
	if r.State.Settings.TargetScore != constants.DefaultTargetScore {
		t.Errorf("expected TargetScore to default to %d, got %d", constants.DefaultTargetScore, r.State.Settings.TargetScore)
	}
}
