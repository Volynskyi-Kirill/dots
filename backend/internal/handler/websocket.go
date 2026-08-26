package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
	"github.com/dots-game/backend/internal/game"
	"github.com/dots-game/backend/internal/service"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
		if allowedOrigin == "" {
			return true // Fallback for local development
		}
		origin := r.Header.Get("Origin")
		return origin == allowedOrigin || origin == "http://localhost:3000" || origin == "http://localhost:5173"
	},
}

type wsClient struct {
	conn *websocket.Conn
	send chan []byte
}

func (c *wsClient) GetID() string {
	return c.conn.RemoteAddr().String()
}

func (c *wsClient) Send(message []byte) {
	c.send <- message
}

func writePump(c *wsClient) {
	defer c.conn.Close()
	for msg := range c.send {
		err := c.conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			return
		}
	}
}

type wsSession struct {
	client   *wsClient
	room     *service.Room
	playerID int
	rm       service.RoomManager
	logic    game.Logic
	width    int
	height   int
}

func ServeWS(rm service.RoomManager, logic game.Logic, width, height int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			slog.Error("Upgrade error", "event", "websocket_upgrade_error", "error", err)
			return
		}

		conn.SetReadLimit(8192) // 8KB max message size

		client := &wsClient{
			conn: conn,
			send: make(chan []byte, 256),
		}

		go writePump(client)

		session := &wsSession{
			client: client,
			rm:     rm,
			logic:  logic,
			width:  width,
			height: height,
		}

		defer session.cleanup()

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				break
			}

			var msg domain.Message
			if err := json.Unmarshal(message, &msg); err != nil {
				continue
			}

			switch msg.Type {
			case constants.MessageJoin:
				session.handleJoin(msg)
			case constants.MessageMove:
				session.handleMove(msg)
			case constants.MessageSurrender:
				session.handleSurrender(msg)
			case constants.MessageRematchRequest:
				session.handleRematchRequest(msg)
			case constants.MessageRematchAnswer:
				session.handleRematchAnswer(msg)
			case constants.MessageUndoRequest:
				session.handleUndoRequest(msg)
			case constants.MessageUndoAnswer:
				session.handleUndoAnswer(msg)
			}
		}
	}
}

func (s *wsSession) cleanup() {
	if s.room != nil {
		slog.Info("Client disconnected", "event", "client_disconnected", "room_id", s.room.ID, "player_id", s.playerID)
		s.rm.LeaveRoom(s.room.ID, s.client)
		if s.playerID > 0 {
			s.room.StateMutex.Lock()
			state := s.room.State
			if state != nil {
				if s.playerID == 1 {
					state.P1Disconnected = true
				} else if s.playerID == 2 {
					state.P2Disconnected = true
				}

				if state.Status == constants.StatusPlaying {
					timeoutStr := os.Getenv("DISCONNECT_TIMEOUT")
					timeout := int64(15)
					if timeoutStr != "" {
						if val, err := strconv.ParseInt(timeoutStr, 10, 64); err == nil {
							timeout = val
						}
					}
					state.DisconnectDeadline = time.Now().UnixMilli() + (timeout * 1000)
				}

				stateBytes, _ := json.Marshal(domain.Message{
					Type:    constants.MessageState,
					Payload: marshalState(state),
				})
				s.room.Broadcast <- stateBytes
			}
			s.room.StateMutex.Unlock()
		}
	}
	s.client.conn.Close()
}

func (s *wsSession) handleJoin(msg domain.Message) {
	var payload domain.JoinPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return
	}

	if payload.Settings.BoardWidth == 0 || payload.Settings.BoardHeight == 0 {
		payload.Settings.BoardWidth = s.width
		payload.Settings.BoardHeight = s.height
	}

	room, pid, _ := s.rm.JoinRoom(payload.RoomID, payload.SessionID, s.client)
	if room == nil {
		return
	}

	s.room = room
	s.playerID = pid

	s.room.StateMutex.Lock()
	if s.room.State == nil {
		s.initState(payload.Settings)
	}

	state := s.room.State

	if s.playerID == 1 {
		state.P1Disconnected = false
	} else if s.playerID == 2 {
		state.P2Disconnected = false
	}

	s.room.Mutex.Lock()
	clientsCount := len(s.room.Clients)
	s.room.Mutex.Unlock()

	if (clientsCount == 2 || (state.Settings.IsLocal && clientsCount == 1)) && state.Status == constants.StatusWaiting {
		state.Status = constants.StatusPlaying
		slog.Info("Game started", "event", "game_started", "room_id", s.room.ID)
		if state.Settings.TimerEnabled && state.LastMoveTime == 0 {
			state.LastMoveTime = time.Now().UnixMilli()
		}
	}

	welcomeBytes, _ := json.Marshal(domain.Message{
		Type:    constants.MessageWelcome,
		Payload: marshalWelcome(s.playerID),
	})
	s.client.Send(welcomeBytes)

	stateBytes, _ := json.Marshal(domain.Message{
		Type:    constants.MessageState,
		Payload: marshalState(state),
	})
	s.room.Broadcast <- stateBytes

	s.room.StateMutex.Unlock()
}

func (s *wsSession) initState(settings domain.RoomSettings) {
	board := make([][]int, settings.BoardHeight)
	for i := range board {
		board[i] = make([]int, settings.BoardWidth)
	}
	state := &domain.GameState{
		Board:    board,
		Settings: settings,
	}
	s.logic.InitState(state)
	state.Status = constants.StatusWaiting
	s.room.State = state

	go startTimerLoop(s.room)
}

func startTimerLoop(r *service.Room) {
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-r.Quit:
			return
		case <-ticker.C:
			r.StateMutex.Lock()
			state := r.State
			if state == nil {
				r.StateMutex.Unlock()
				return
			}

			if state.Status == constants.StatusPlaying {
				isDisconnected := state.P1Disconnected || (state.P2Disconnected && !state.Settings.IsLocal)
				if isDisconnected && state.DisconnectDeadline > 0 {
					if time.Now().UnixMilli() > state.DisconnectDeadline {
						state.Status = constants.StatusFinished
						state.WinReason = constants.ReasonDisconnect
						if state.P1Disconnected {
							state.Winner = 2
							state.MatchScoreP2++
						} else {
							state.Winner = 1
							state.MatchScoreP1++
						}
						state.DisconnectDeadline = 0 // clear

						slog.Info("Game finished", "event", "game_finished", "room_id", r.ID, "reason", "disconnect", "winner", state.Winner)

						stateBytes, _ := json.Marshal(domain.Message{
							Type:    "state",
							Payload: marshalState(state),
						})
						r.Broadcast <- stateBytes
						r.StateMutex.Unlock()
						continue
					}
				}

				if state.Settings.TimerEnabled && state.LastMoveTime > 0 && !state.P1Disconnected && !state.P2Disconnected {
					elapsed := time.Now().UnixMilli() - state.LastMoveTime
					var timeout bool
					if state.CurrentTurn == 1 {
						if state.TimeP1-elapsed <= 0 {
							state.TimeP1 = 0
							timeout = true
							state.Winner = 2
						}
					} else {
						if state.TimeP2-elapsed <= 0 {
							state.TimeP2 = 0
							timeout = true
							state.Winner = 1
						}
					}
					if timeout {
						state.Status = constants.StatusFinished
						state.WinReason = constants.ReasonTimeout
						if state.Winner == constants.Player1 {
							state.MatchScoreP1++
						} else if state.Winner == constants.Player2 {
							state.MatchScoreP2++
						}

						slog.Info("Game finished", "event", "game_finished", "room_id", r.ID, "reason", "timeout", "winner", state.Winner)

						stateBytes, _ := json.Marshal(domain.Message{
							Type:    "state",
							Payload: marshalState(state),
						})
						r.Broadcast <- stateBytes
					}
				}
			}
			r.StateMutex.Unlock()
		}
	}
}

func (s *wsSession) handleMove(msg domain.Message) {
	if s.room == nil {
		return
	}
	var payload domain.MovePayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return
	}

	s.room.StateMutex.Lock()
	defer s.room.StateMutex.Unlock()

	state := s.room.State
	if state == nil {
		return
	}

	if state.Settings.TimerEnabled && state.LastMoveTime > 0 {
		elapsed := time.Now().UnixMilli() - state.LastMoveTime
		if state.CurrentTurn == constants.Player1 {
			state.TimeP1 -= elapsed
			if state.TimeP1 < 0 {
				state.TimeP1 = 0
			}
		} else {
			state.TimeP2 -= elapsed
			if state.TimeP2 < 0 {
				state.TimeP2 = 0
			}
		}
	}

	activePlayerID := s.playerID
	if state.Settings.IsLocal && s.playerID == 1 {
		activePlayerID = state.CurrentTurn
	}

	if err := s.logic.MakeMove(state, activePlayerID, payload.X, payload.Y); err == nil {
		if state.Settings.TimerEnabled && state.LastMoveTime > 0 {
			if activePlayerID == constants.Player1 {
				state.TimeP1 += state.Settings.Increment
			} else {
				state.TimeP2 += state.Settings.Increment
			}
		}
		if state.Settings.TimerEnabled {
			state.LastMoveTime = time.Now().UnixMilli()
		}

		record := domain.MoveRecord{
			X:      payload.X,
			Y:      payload.Y,
			TimeP1: state.TimeP1,
			TimeP2: state.TimeP2,
		}
		state.MovesHistory = append(state.MovesHistory, record)
		state.UndoRequestedBy = 0

		if len(state.MovesHistory)+4 >= (state.Settings.BoardWidth * state.Settings.BoardHeight) {
			state.Status = constants.StatusFinished
			state.WinReason = constants.ReasonBoardFull
			if len(state.CapturedP1) > len(state.CapturedP2) {
				state.Winner = constants.Player1
				state.MatchScoreP1++
			} else if len(state.CapturedP2) > len(state.CapturedP1) {
				state.Winner = constants.Player2
				state.MatchScoreP2++
			} else {
				state.Winner = 0
			}

			slog.Info("Game finished", "event", "game_finished", "room_id", s.room.ID, "reason", "board_full", "winner", state.Winner, "moves_count", len(state.MovesHistory))
		}

		stateBytes, _ := json.Marshal(domain.Message{
			Type:    constants.MessageState,
			Payload: marshalState(state),
		})
		s.room.Broadcast <- stateBytes
	} else {
		errBytes, _ := json.Marshal(domain.Message{
			Type:    constants.MessageError,
			Payload: []byte(`"` + err.Error() + `"`),
		})
		s.client.Send(errBytes)
	}
}

func (s *wsSession) handleSurrender(msg domain.Message) {
	if s.room == nil {
		return
	}
	s.room.StateMutex.Lock()
	defer s.room.StateMutex.Unlock()

	state := s.room.State
	if state != nil && state.Status == constants.StatusPlaying {
		state.Status = constants.StatusFinished
		state.WinReason = constants.ReasonSurrender
		if s.playerID == constants.Player1 {
			state.Winner = constants.Player2
			state.MatchScoreP2++
		} else {
			state.Winner = constants.Player1
			state.MatchScoreP1++
		}
		
		slog.Info("Game finished", "event", "game_finished", "room_id", s.room.ID, "reason", "surrender", "winner", state.Winner)
		
		stateBytes, _ := json.Marshal(domain.Message{
			Type:    constants.MessageState,
			Payload: marshalState(state),
		})
		s.room.Broadcast <- stateBytes
	}
}

func (s *wsSession) handleRematchRequest(msg domain.Message) {
	if s.room == nil {
		return
	}
	s.room.StateMutex.Lock()
	defer s.room.StateMutex.Unlock()

	state := s.room.State
	if state != nil && state.Status == constants.StatusFinished {
		state.RematchRequestedBy = s.playerID
		stateBytes, _ := json.Marshal(domain.Message{
			Type:    constants.MessageState,
			Payload: marshalState(state),
		})
		s.room.Broadcast <- stateBytes
	}
}

func (s *wsSession) handleRematchAnswer(msg domain.Message) {
	if s.room == nil {
		return
	}
	var payload domain.UndoAnswerPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return
	}

	s.room.StateMutex.Lock()
	defer s.room.StateMutex.Unlock()

	state := s.room.State
	if state != nil && state.Status == constants.StatusFinished && state.RematchRequestedBy != 0 && (state.Settings.IsLocal || state.RematchRequestedBy != s.playerID) {
		if payload.Accept {
			if state.StartingPlayer == constants.Player1 {
				state.StartingPlayer = constants.Player2
			} else {
				state.StartingPlayer = constants.Player1
			}

			s.logic.InitState(state)

			s.room.Mutex.Lock()
			clientsCount := len(s.room.Clients)
			s.room.Mutex.Unlock()

			if clientsCount == 2 {
				state.Status = constants.StatusPlaying
				slog.Info("Game started", "event", "game_started", "room_id", s.room.ID)
				if state.Settings.TimerEnabled {
					state.LastMoveTime = time.Now().UnixMilli()
				}
			} else {
				state.Status = constants.StatusWaiting
			}
		}
		state.RematchRequestedBy = 0

		stateBytes, _ := json.Marshal(domain.Message{
			Type:    constants.MessageState,
			Payload: marshalState(state),
		})
		s.room.Broadcast <- stateBytes
	}
}

func (s *wsSession) handleUndoRequest(msg domain.Message) {
	if s.room == nil {
		return
	}
	s.room.StateMutex.Lock()
	defer s.room.StateMutex.Unlock()

	state := s.room.State
	if state != nil && state.Status == constants.StatusPlaying && len(state.MovesHistory) > 0 {
		if state.Settings.IsLocal || state.CurrentTurn != s.playerID {
			state.UndoRequestedBy = s.playerID
			stateBytes, _ := json.Marshal(domain.Message{
				Type:    constants.MessageState,
				Payload: marshalState(state),
			})
			s.room.Broadcast <- stateBytes
		}
	}
}

func (s *wsSession) handleUndoAnswer(msg domain.Message) {
	if s.room == nil {
		return
	}
	var payload domain.UndoAnswerPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return
	}

	s.room.StateMutex.Lock()
	defer s.room.StateMutex.Unlock()

	state := s.room.State
	if state != nil && state.UndoRequestedBy != 0 && (state.Settings.IsLocal || state.UndoRequestedBy != s.playerID) {
		if payload.Accept {
			if len(state.MovesHistory) > 0 {
				state.MovesHistory = state.MovesHistory[:len(state.MovesHistory)-1]
				s.logic.RebuildState(state)
			}
		}
		state.UndoRequestedBy = 0

		stateBytes, _ := json.Marshal(domain.Message{
			Type:    constants.MessageState,
			Payload: marshalState(state),
		})
		s.room.Broadcast <- stateBytes
	}
}

func marshalState(state *domain.GameState) []byte {
	b, _ := json.Marshal(state)
	return b
}

func marshalWelcome(playerID int) []byte {
	payload := domain.WelcomePayload{PlayerID: playerID}
	b, _ := json.Marshal(payload)
	return b
}
