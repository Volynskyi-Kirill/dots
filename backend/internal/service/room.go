package service

import (
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
	"github.com/dots-game/backend/internal/game"
)

type Room struct {
	ID             string
	Clients        map[Client]int
	Player1Session string
	Player2Session string
	Mutex          sync.Mutex
	Broadcast      chan []byte
	Quit           chan struct{}

	State      *domain.GameState
	StateMutex sync.RWMutex
	Logic      game.Logic
}

func (r *Room) getEffectivePlayerID(clientID int) int {
	if r.State != nil && r.State.Settings.IsLocal && clientID == 1 {
		return r.State.CurrentTurn
	}
	return clientID
}

func (r *Room) BroadcastState() {
	b, _ := json.Marshal(r.State)
	msg, _ := json.Marshal(domain.Message{
		Type:    constants.MessageState,
		Payload: b,
	})
	r.Broadcast <- msg
}

func (r *Room) InitState(settings domain.RoomSettings, width, height int) {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State == nil {
		if settings.BoardWidth == 0 || settings.BoardHeight == 0 {
			settings.BoardWidth = width
			settings.BoardHeight = height
		}
		
		newState := &domain.GameState{
			Status:         constants.StatusWaiting,
			Settings:       settings,
			Board:          make([][]int, settings.BoardHeight),
			CurrentTurn:    1,
			StartingPlayer: 1,
			CapturedP1:     make([]domain.Point, 0),
			CapturedP2:     make([]domain.Point, 0),
			MovesHistory:   make([]domain.MoveRecord, 0),
			TimeP1:         int64(settings.InitialTime * 60 * 1000),
			TimeP2:         int64(settings.InitialTime * 60 * 1000),
		}
		for i := range newState.Board {
			newState.Board[i] = make([]int, settings.BoardWidth)
		}
		r.Logic.InitState(newState)
		r.State = newState
	}
}

func (r *Room) StartGameIfNeeded() {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()
	
	if r.State == nil {
		return
	}
	
	r.Mutex.Lock()
	clientsCount := len(r.Clients)
	r.Mutex.Unlock()

	if (clientsCount == 2 || (r.State.Settings.IsLocal && clientsCount == 1)) && r.State.Status == constants.StatusWaiting {
		r.State.Status = constants.StatusPlaying
		slog.Info("Game started", "event", "game_started", "room_id", r.ID)
		if r.State.Settings.TimerEnabled && r.State.LastMoveTime == 0 {
			r.State.LastMoveTime = time.Now().UnixMilli()
		}
	}
}

func (r *Room) HandleClientDisconnected(playerID int) {
	if playerID <= 0 {
		return
	}
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()
	
	if r.State != nil {
		if playerID == 1 {
			r.State.P1Disconnected = true
		} else if playerID == 2 {
			r.State.P2Disconnected = true
		}
		
		if r.State.Status == constants.StatusPlaying {
			r.State.DisconnectDeadline = time.Now().UnixMilli() + 60000
		}
		r.BroadcastState()
	}
}

func (r *Room) HandleClientReconnected(playerID int) {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()
	
	if r.State != nil {
		if playerID == 1 {
			r.State.P1Disconnected = false
		} else if playerID == 2 {
			r.State.P2Disconnected = false
		}
		r.State.DisconnectDeadline = 0
	}
}

func (r *Room) MakeMove(clientID, x, y int) error {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State == nil || r.State.Status != constants.StatusPlaying {
		return errors.New("game not playing")
	}

	effectivePlayer := r.getEffectivePlayerID(clientID)

	if err := r.Logic.MakeMove(r.State, effectivePlayer, x, y); err != nil {
		return err
	}

	if r.State.Settings.TimerEnabled && r.State.LastMoveTime > 0 {
		if effectivePlayer == constants.Player1 {
			r.State.TimeP1 += r.State.Settings.Increment
		} else {
			r.State.TimeP2 += r.State.Settings.Increment
		}
		r.State.LastMoveTime = time.Now().UnixMilli()
	}

	record := domain.MoveRecord{
		X:      x,
		Y:      y,
		TimeP1: r.State.TimeP1,
		TimeP2: r.State.TimeP2,
	}
	r.State.MovesHistory = append(r.State.MovesHistory, record)
	r.State.UndoRequestedBy = 0

	if len(r.State.MovesHistory)+4 >= (r.State.Settings.BoardWidth * r.State.Settings.BoardHeight) {
		r.State.Status = constants.StatusFinished
		r.State.WinReason = constants.ReasonBoardFull
		if len(r.State.CapturedP1) > len(r.State.CapturedP2) {
			r.State.Winner = constants.Player1
			r.State.MatchScoreP1++
		} else if len(r.State.CapturedP2) > len(r.State.CapturedP1) {
			r.State.Winner = constants.Player2
			r.State.MatchScoreP2++
		} else {
			r.State.Winner = 0
		}
		slog.Info("Game finished", "event", "game_finished", "room_id", r.ID, "reason", "board_full")
	}

	r.BroadcastState()
	return nil
}

func (r *Room) Surrender(clientID int) {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State == nil || r.State.Status != constants.StatusPlaying {
		return
	}

	effectivePlayer := r.getEffectivePlayerID(clientID)

	r.State.Status = constants.StatusFinished
	r.State.WinReason = constants.ReasonSurrender
	if effectivePlayer == constants.Player1 {
		r.State.Winner = constants.Player2
		r.State.MatchScoreP2++
	} else {
		r.State.Winner = constants.Player1
		r.State.MatchScoreP1++
	}
	
	slog.Info("Game finished", "event", "game_finished", "room_id", r.ID, "reason", "surrender")
	r.BroadcastState()
}

func (r *Room) RequestRematch(clientID int) {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State != nil && r.State.Status == constants.StatusFinished {
		r.State.RematchRequestedBy = clientID
		r.BroadcastState()
	}
}

func (r *Room) AnswerRematch(clientID int, accept bool) {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State == nil || r.State.Status != constants.StatusFinished || r.State.RematchRequestedBy == 0 {
		return
	}

	if r.State.Settings.IsLocal || r.State.RematchRequestedBy != clientID {
		if accept {
			if r.State.StartingPlayer == constants.Player1 {
				r.State.StartingPlayer = constants.Player2
			} else {
				r.State.StartingPlayer = constants.Player1
			}
			r.Logic.InitState(r.State)

			r.Mutex.Lock()
			clientsCount := len(r.Clients)
			r.Mutex.Unlock()

			if clientsCount == 2 || (r.State.Settings.IsLocal && clientsCount == 1) {
				r.State.Status = constants.StatusPlaying
				slog.Info("Game restarted", "event", "game_restarted", "room_id", r.ID)
				if r.State.Settings.TimerEnabled {
					r.State.LastMoveTime = time.Now().UnixMilli()
				}
			} else {
				r.State.Status = constants.StatusWaiting
			}
		} else {
			r.State.RematchRequestedBy = 0
		}
		r.BroadcastState()
	}
}

func (r *Room) RequestUndo(clientID int) {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State == nil || r.State.Status != constants.StatusPlaying || len(r.State.MovesHistory) == 0 {
		return
	}

	effectivePlayer := r.getEffectivePlayerID(clientID)
	if r.State.Settings.IsLocal || r.State.CurrentTurn != effectivePlayer {
		r.State.UndoRequestedBy = clientID
		r.BroadcastState()
	}
}

func (r *Room) AnswerUndo(clientID int, accept bool) {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State == nil || r.State.UndoRequestedBy == 0 {
		return
	}

	if r.State.Settings.IsLocal || r.State.UndoRequestedBy != clientID {
		if accept {
			if len(r.State.MovesHistory) > 0 {
				r.State.MovesHistory = r.State.MovesHistory[:len(r.State.MovesHistory)-1]
				r.Logic.RebuildState(r.State)
			}
		}
		r.State.UndoRequestedBy = 0
		r.BroadcastState()
	}
}

func (r *Room) Run() {
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case msg := <-r.Broadcast:
			r.Mutex.Lock()
			for client := range r.Clients {
				client.Send(msg)
			}
			r.Mutex.Unlock()
		case <-r.Quit:
			return
		case <-ticker.C:
			r.checkTimeouts()
		}
	}
}

func (r *Room) checkTimeouts() {
	r.StateMutex.Lock()
	defer r.StateMutex.Unlock()

	if r.State == nil || r.State.Status != constants.StatusPlaying {
		return
	}

	isDisconnected := r.State.P1Disconnected || (r.State.P2Disconnected && !r.State.Settings.IsLocal)
	if isDisconnected && r.State.DisconnectDeadline > 0 {
		if time.Now().UnixMilli() > r.State.DisconnectDeadline {
			r.State.Status = constants.StatusFinished
			r.State.WinReason = constants.ReasonDisconnect
			if r.State.P1Disconnected {
				r.State.Winner = 2
				r.State.MatchScoreP2++
			} else {
				r.State.Winner = 1
				r.State.MatchScoreP1++
			}
			r.State.DisconnectDeadline = 0
			slog.Info("Game finished", "event", "game_finished", "room_id", r.ID, "reason", "disconnect")
			r.BroadcastState()
			return
		}
	}

	if r.State.Settings.TimerEnabled && r.State.LastMoveTime > 0 && !r.State.P1Disconnected && !r.State.P2Disconnected {
		elapsed := time.Now().UnixMilli() - r.State.LastMoveTime
		var timeout bool
		
		if r.State.CurrentTurn == 1 {
			if r.State.TimeP1-elapsed <= 0 {
				r.State.TimeP1 = 0
				timeout = true
				r.State.Winner = 2
			}
		} else {
			if r.State.TimeP2-elapsed <= 0 {
				r.State.TimeP2 = 0
				timeout = true
				r.State.Winner = 1
			}
		}
		
		if timeout {
			r.State.Status = constants.StatusFinished
			r.State.WinReason = constants.ReasonTimeout
			if r.State.Winner == constants.Player1 {
				r.State.MatchScoreP1++
			} else if r.State.Winner == constants.Player2 {
				r.State.MatchScoreP2++
			}
			slog.Info("Game finished", "event", "game_finished", "room_id", r.ID, "reason", "timeout")
			r.BroadcastState()
		}
	}
}
