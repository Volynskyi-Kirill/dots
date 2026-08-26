package handler

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
	"github.com/dots-game/backend/internal/game"
	"github.com/dots-game/backend/internal/service"
	"github.com/gorilla/websocket"
)

func setupTestServer() (*httptest.Server, service.RoomManager) {
	rm := service.NewRoomManager()
	lg := game.NewGameLogic()
	handler := ServeWS(rm, lg, 39, 39)
	return httptest.NewServer(handler), rm
}

func mustMarshal(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func readWithTimeout(t *testing.T, c *websocket.Conn) domain.Message {
	t.Helper()
	c.SetReadDeadline(time.Now().Add(2 * time.Second))
	var msg domain.Message
	err := c.ReadJSON(&msg)
	if err != nil {
		t.Fatalf("failed to read ws message: %v", err)
	}
	t.Logf("Received message: %s", msg.Type)
	if msg.Type == constants.MessageError {
		t.Logf("Error payload: %s", string(msg.Payload))
	}
	return msg
}

func TestWebSocket_IntegrationFlow(t *testing.T) {
	ts, _ := setupTestServer()
	defer ts.Close()

	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")

	// --- 1. Player 1 Joins ---
	c1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("could not connect p1: %v", err)
	}
	defer c1.Close()

	joinP1 := domain.Message{
		Type: constants.MessageJoin,
		Payload: mustMarshal(domain.JoinPayload{
			RoomID:    "test-room",
			SessionID: "session-1",
			Settings:  domain.RoomSettings{TimerEnabled: false},
		}),
	}
	c1.WriteJSON(joinP1)

	// P1 receives Welcome
	msg := readWithTimeout(t, c1)
	if msg.Type != constants.MessageWelcome {
		t.Fatalf("expected welcome, got %s", msg.Type)
	}

	// P1 receives State (waiting)
	msg = readWithTimeout(t, c1)
	if msg.Type != constants.MessageState {
		t.Fatalf("expected state, got %s", msg.Type)
	}
	var state domain.GameState
	json.Unmarshal(msg.Payload, &state)
	if state.Status != constants.StatusWaiting {
		t.Fatalf("expected status waiting, got %s", state.Status)
	}

	// --- 2. Player 2 Joins ---
	c2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("could not connect p2: %v", err)
	}
	defer c2.Close()

	joinP2 := domain.Message{
		Type: constants.MessageJoin,
		Payload: mustMarshal(domain.JoinPayload{
			RoomID:    "test-room",
			SessionID: "session-2",
			Settings:  domain.RoomSettings{TimerEnabled: false},
		}),
	}
	c2.WriteJSON(joinP2)

	// P2 receives Welcome
	msg = readWithTimeout(t, c2)
	if msg.Type != constants.MessageWelcome {
		t.Fatalf("expected welcome, got %s", msg.Type)
	}

	// Wait for State broadcast to both (Status -> playing)
	// c1 receives it
	msgC1 := readWithTimeout(t, c1)
	// c2 receives it
	msgC2 := readWithTimeout(t, c2)

	json.Unmarshal(msgC2.Payload, &state)
	if state.Status != constants.StatusPlaying {
		t.Fatalf("expected status playing, got %s", state.Status)
	}

	// Determine whose turn it is based on state.CurrentTurn
	// Let's assume P1 is turn 1, P2 is turn 2. We'll use c1 if it's P1's turn, else c2.
	activeConn := c1
	if state.CurrentTurn == constants.Player2 {
		activeConn = c2
	}

	// --- 3. Make a Move ---
	move := domain.Message{
		Type: constants.MessageMove,
		Payload: mustMarshal(domain.MovePayload{
			X: 10,
			Y: 10,
		}),
	}
	activeConn.WriteJSON(move)

	// Both should receive the updated state
	msgC1 = readWithTimeout(t, c1)
	msgC2 = readWithTimeout(t, c2)

	json.Unmarshal(msgC1.Payload, &state)
	if state.Board[10][10] == constants.Empty {
		t.Fatalf("expected dot at 10,10")
	}

	// --- 4. Surrender ---
	surrender := domain.Message{
		Type:    constants.MessageSurrender,
		Payload: []byte(`{}`),
	}
	activeConn.WriteJSON(surrender)

	msgC1 = readWithTimeout(t, c1)
	msgC2 = readWithTimeout(t, c2)

	json.Unmarshal(msgC1.Payload, &state)
	if state.Status != constants.StatusFinished {
		t.Fatalf("expected status finished, got %s", state.Status)
	}
	if state.WinReason != constants.ReasonSurrender {
		t.Fatalf("expected winReason surrender, got %s", state.WinReason)
	}
}
