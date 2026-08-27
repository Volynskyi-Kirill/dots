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
