package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
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
	select {
	case c.send <- message:
	default:
		slog.Warn("WebSocket send buffer full, closing connection", "client", c.GetID())
		c.conn.Close()
	}
}

func writePump(c *wsClient) {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
}

type wsSession struct {
	client   *wsClient
	room     *service.Room
	playerID int
	rm       service.RoomManager
	width    int
	height   int
}

func ServeWS(rm service.RoomManager, width, height int) http.HandlerFunc {
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
			width:  width,
			height: height,
		}

		defer func() {
			close(client.send)
			session.cleanup()
		}()

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
				if session.room != nil {
					session.room.Surrender(session.playerID)
				}
			case constants.MessageRematchRequest:
				if session.room != nil {
					session.room.RequestRematch(session.playerID)
				}
			case constants.MessageRematchAnswer:
				session.handleRematchAnswer(msg)
			case constants.MessageUndoRequest:
				if session.room != nil {
					session.room.RequestUndo(session.playerID)
				}
			case constants.MessageUndoAnswer:
				session.handleUndoAnswer(msg)
			}
		}
	}
}

func (s *wsSession) cleanup() {
	if s.room != nil {
		slog.Info("Client disconnected", "event", "client_disconnected", "room_id", s.room.ID, "player_id", s.playerID)
		s.room.HandleClientDisconnected(s.playerID)
		s.rm.LeaveRoom(s.room.ID, s.client)
	}
}

func (s *wsSession) handleJoin(msg domain.Message) {
	var payload domain.JoinPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return
	}

	room, pid, _ := s.rm.JoinRoom(payload.RoomID, payload.SessionID, s.client)
	if room == nil {
		return
	}

	s.room = room
	s.playerID = pid

	s.room.InitState(payload.Settings, s.width, s.height)
	s.room.HandleClientReconnected(s.playerID)

	b, _ := json.Marshal(domain.Message{
		Type:    constants.MessageWelcome,
		Payload: marshalWelcome(s.playerID),
	})
	s.client.Send(b)

	s.room.StartGameIfNeeded()
	s.room.BroadcastState()
}

func (s *wsSession) handleMove(msg domain.Message) {
	if s.room == nil {
		return
	}
	var payload domain.MovePayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return
	}
	
	if err := s.room.MakeMove(s.playerID, payload.X, payload.Y); err != nil {
		errBytes, _ := json.Marshal(domain.Message{
			Type:    constants.MessageError,
			Payload: []byte(`"` + err.Error() + `"`),
		})
		s.client.Send(errBytes)
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
	s.room.AnswerRematch(s.playerID, payload.Accept)
}

func (s *wsSession) handleUndoAnswer(msg domain.Message) {
	if s.room == nil {
		return
	}
	var payload domain.UndoAnswerPayload
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		return
	}
	s.room.AnswerUndo(s.playerID, payload.Accept)
}

func marshalWelcome(playerID int) []byte {
	b, _ := json.Marshal(map[string]int{"playerId": playerID})
	return b
}
