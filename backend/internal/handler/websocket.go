package handler

import (
	"encoding/json"
	"log"
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
				if playerID > 0 {
					state, exists := gameStates[currentRoom.ID]
					if exists && state.Status == "playing" {
						if playerID == 1 {
							state.P1Disconnected = true
						} else if playerID == 2 {
							state.P2Disconnected = true
						}
						timeoutStr := os.Getenv("DISCONNECT_TIMEOUT")
						timeout := int64(15)
						if timeoutStr != "" {
							if val, err := strconv.ParseInt(timeoutStr, 10, 64); err == nil {
								timeout = val
							}
						}
						state.DisconnectDeadline = time.Now().UnixMilli() + (timeout * 1000)
						stateBytes, _ := json.Marshal(domain.Message{
							Type:    constants.MessageState,
							Payload: marshalState(state),
						})
						currentRoom.Broadcast <- stateBytes
					}
				}
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
								Board:    board,
								Settings: payload.Settings,
							}
							logic.InitState(state)
							state.Status = "waiting"
							gameStates[room.ID] = state

							// Timer loop
							go func(rID string) {
								for {
									time.Sleep(200 * time.Millisecond)
									state, exists := gameStates[rID]
									if !exists {
										return
									}
									if state.Status == "playing" {
										// Disconnect timeout check
										if (state.P1Disconnected || state.P2Disconnected) && state.DisconnectDeadline > 0 {
											if time.Now().UnixMilli() > state.DisconnectDeadline {
												state.Status = "finished"
												state.WinReason = "disconnect"
												if state.P1Disconnected {
													state.Winner = 2
													state.MatchScoreP2++
												} else {
													state.Winner = 1
													state.MatchScoreP1++
												}
												state.DisconnectDeadline = 0 // clear
												
												room := rm.GetRoom(rID)
												if room != nil {
													stateBytes, _ := json.Marshal(domain.Message{
														Type:    "state",
														Payload: marshalState(state),
													})
													room.Broadcast <- stateBytes
												}
												continue
											}
										}

										if state.Settings.TimerEnabled && state.LastMoveTime > 0 && !state.P1Disconnected && !state.P2Disconnected {
										elapsed := time.Now().UnixMilli() - state.LastMoveTime
										var timeout bool
										if state.CurrentTurn == 1 { // Player1
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
											state.Status = "finished"
											state.WinReason = "timeout"
											if state.Winner == constants.Player1 {
												state.MatchScoreP1++
											} else if state.Winner == constants.Player2 {
												state.MatchScoreP2++
											}
											room := rm.GetRoom(rID)
											if room != nil {
												stateBytes, _ := json.Marshal(domain.Message{
													Type:    "state", // constants.MessageState
													Payload: marshalState(state),
												})
												room.Broadcast <- stateBytes
											}
										}
										}
									}
								}
							}(room.ID)
						}

						state := gameStates[room.ID]
						
						// Clear disconnect flag for the joining player
						if playerID == 1 {
							state.P1Disconnected = false
						} else if playerID == 2 {
							state.P2Disconnected = false
						}
						
						if len(room.Clients) == 2 && state.Status == "waiting" {
							state.Status = "playing"
							if state.Settings.TimerEnabled && state.LastMoveTime == 0 {
								state.LastMoveTime = time.Now().UnixMilli()
							}
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

						if err := logic.MakeMove(state, playerID, payload.X, payload.Y); err == nil {
							// Apply increment
							if state.Settings.TimerEnabled && state.LastMoveTime > 0 {
								if playerID == constants.Player1 {
									state.TimeP1 += state.Settings.Increment
								} else {
									state.TimeP2 += state.Settings.Increment
								}
							}
							if state.Settings.TimerEnabled {
								state.LastMoveTime = time.Now().UnixMilli()
							}

							// Update history and reset undo state
							record := domain.MoveRecord{
								X: payload.X,
								Y: payload.Y,
								TimeP1: state.TimeP1,
								TimeP2: state.TimeP2,
							}
							state.MovesHistory = append(state.MovesHistory, record)
							state.UndoRequestedBy = 0

							// Board full check (39x39 = 1521)
							if len(state.MovesHistory) + 4 >= 1521 {
								state.Status = "finished"
								state.WinReason = "board_full"
								if len(state.CapturedP1) > len(state.CapturedP2) {
									state.Winner = constants.Player1
									state.MatchScoreP1++
								} else if len(state.CapturedP2) > len(state.CapturedP1) {
									state.Winner = constants.Player2
									state.MatchScoreP2++
								} else {
									state.Winner = 0
								}
							}

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
			case constants.MessageSurrender:
				if currentRoom != nil {
					state := gameStates[currentRoom.ID]
					if state.Status == "playing" {
						state.Status = "finished"
						state.WinReason = "surrender"
						if playerID == constants.Player1 {
							state.Winner = constants.Player2
							state.MatchScoreP2++
						} else {
							state.Winner = constants.Player1
							state.MatchScoreP1++
						}
						stateBytes, _ := json.Marshal(domain.Message{
							Type:    constants.MessageState,
							Payload: marshalState(state),
						})
						currentRoom.Broadcast <- stateBytes
					}
				}
			case constants.MessageRematchRequest:
				if currentRoom != nil {
					state := gameStates[currentRoom.ID]
					if state.Status == "finished" {
						state.RematchRequestedBy = playerID
						stateBytes, _ := json.Marshal(domain.Message{
							Type:    constants.MessageState,
							Payload: marshalState(state),
						})
						currentRoom.Broadcast <- stateBytes
					}
				}
			case constants.MessageRematchAnswer:
				if currentRoom != nil {
					var payload domain.UndoAnswerPayload // reusing struct since it has `accept` bool
					if err := json.Unmarshal(msg.Payload, &payload); err == nil {
						state := gameStates[currentRoom.ID]
						if state.Status == "finished" && state.RematchRequestedBy != 0 && state.RematchRequestedBy != playerID {
							if payload.Accept {
								// Start rematch
								if state.StartingPlayer == constants.Player1 {
									state.StartingPlayer = constants.Player2
								} else {
									state.StartingPlayer = constants.Player1
								}
								
								logic.InitState(state)
								
								if len(currentRoom.Clients) == 2 {
									state.Status = "playing"
									if state.Settings.TimerEnabled {
										state.LastMoveTime = time.Now().UnixMilli()
									}
								} else {
									state.Status = "waiting"
								}
							}
							state.RematchRequestedBy = 0
							
							stateBytes, _ := json.Marshal(domain.Message{
								Type:    constants.MessageState,
								Payload: marshalState(state),
							})
							currentRoom.Broadcast <- stateBytes
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
