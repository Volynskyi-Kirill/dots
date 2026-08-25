package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
	"github.com/dots-game/backend/internal/game"
	"github.com/dots-game/backend/internal/service"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
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

// In-memory state for simplicity in this example. 
// A real app might store this in Room struct or a GameState service.
var gameStates = make(map[string]*domain.GameState)

func ServeWS(rm service.RoomManager, logic game.Logic, width, height int) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("upgrade error:", err)
			return
		}

		client := &wsClient{
			conn: conn,
			send: make(chan []byte, 256),
		}

		go writePump(client)

		var currentRoom *service.Room
		var playerID int

		defer func() {
			if currentRoom != nil {
				rm.LeaveRoom(currentRoom.ID, client)
			}
			conn.Close()
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
				var payload domain.JoinPayload
				if err := json.Unmarshal(msg.Payload, &payload); err == nil {
					room, pid, _ := rm.JoinRoom(payload.RoomID, payload.SessionID, client)
					if room != nil {
						currentRoom = room
						playerID = pid
						
						// Initialize game state if it doesn't exist
						if _, exists := gameStates[room.ID]; !exists {
							board := make([][]int, height)
							for i := range board {
								board[i] = make([]int, width)
							}
							state := &domain.GameState{
								Board: board,
							}
							logic.InitState(state)
							state.Status = "waiting"
							gameStates[room.ID] = state
						}
						
						state := gameStates[room.ID]
						if len(room.Clients) == 2 {
							state.Status = "playing"
						}

						// Send welcome message to the newly joined client
						welcomeBytes, _ := json.Marshal(domain.Message{
							Type:    constants.MessageWelcome,
							Payload: marshalWelcome(playerID),
						})
						client.Send(welcomeBytes)

						// Send current state
						stateBytes, _ := json.Marshal(domain.Message{
							Type:    constants.MessageState,
							Payload: marshalState(state),
						})
						room.Broadcast <- stateBytes
					}
				}
			case constants.MessageMove:
				if currentRoom != nil {
					var payload domain.MovePayload
					if err := json.Unmarshal(msg.Payload, &payload); err == nil {
						state := gameStates[currentRoom.ID]
						if err := logic.MakeMove(state, playerID, payload.X, payload.Y); err == nil {
							// Update history and reset undo state
							state.MovesHistory = append(state.MovesHistory, domain.Point{X: payload.X, Y: payload.Y})
							state.UndoRequestedBy = 0

							stateBytes, _ := json.Marshal(domain.Message{
								Type:    constants.MessageState,
								Payload: marshalState(state),
							})
							currentRoom.Broadcast <- stateBytes
						} else {
							// Send error to specific client
							errBytes, _ := json.Marshal(domain.Message{
								Type:    constants.MessageError,
								Payload: []byte(`"` + err.Error() + `"`),
							})
							client.Send(errBytes)
						}
					}
				}
			case constants.MessageUndoRequest:
				if currentRoom != nil {
					state := gameStates[currentRoom.ID]
					// Only the player who made the last move can request undo
					if state.Status == "playing" && len(state.MovesHistory) > 0 {
						// The person who made the last move is the one whose turn it is NOT
						if state.CurrentTurn != playerID {
							state.UndoRequestedBy = playerID
							stateBytes, _ := json.Marshal(domain.Message{
								Type:    constants.MessageState,
								Payload: marshalState(state),
							})
							currentRoom.Broadcast <- stateBytes
						}
					}
				}
			case constants.MessageUndoAnswer:
				if currentRoom != nil {
					var payload domain.UndoAnswerPayload
					if err := json.Unmarshal(msg.Payload, &payload); err == nil {
						state := gameStates[currentRoom.ID]
						if state.UndoRequestedBy != 0 && state.UndoRequestedBy != playerID {
							if payload.Accept {
								// Revert the last move
								if len(state.MovesHistory) > 0 {
									state.MovesHistory = state.MovesHistory[:len(state.MovesHistory)-1]
									logic.RebuildState(state)
								}
							}
							state.UndoRequestedBy = 0

							stateBytes, _ := json.Marshal(domain.Message{
								Type:    constants.MessageState,
								Payload: marshalState(state),
							})
							currentRoom.Broadcast <- stateBytes
						}
					}
				}
			}
		}
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
