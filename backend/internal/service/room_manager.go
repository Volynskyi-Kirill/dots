package service

import (
	"log/slog"
	"sync"
	"time"
	"github.com/dots-game/backend/internal/game"
)

type Client interface {
	GetID() string
	Send(message []byte)
}

type RoomManager interface {
	CreateRoom(roomID string) *Room
	GetRoom(roomID string) *Room
	JoinRoom(roomID string, sessionID string, client Client) (*Room, int, error)
	LeaveRoom(roomID string, client Client)
}

type roomManager struct {
	rooms             map[string]*Room
	mutex             sync.Mutex
	logic             game.Logic
	emptyTimeout      time.Duration
	disconnectTimeout time.Duration
}

func NewRoomManager(logic game.Logic, timeoutMinutes int, disconnectTimeoutSeconds int) RoomManager {
	return &roomManager{
		rooms:             make(map[string]*Room),
		logic:             logic,
		emptyTimeout:      time.Duration(timeoutMinutes) * time.Minute,
		disconnectTimeout: time.Duration(disconnectTimeoutSeconds) * time.Second,
	}
}

func (rm *roomManager) CreateRoom(roomID string) *Room {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	room := &Room{
		ID:                roomID,
		Clients:           make(map[Client]int),
		Broadcast:         make(chan []byte, 100),
		Quit:              make(chan struct{}),
		Logic:             rm.logic,
		DisconnectTimeout: rm.disconnectTimeout,
	}
	rm.rooms[roomID] = room

	slog.Info("Room created", "event", "room_created", "room_id", roomID)

	go room.Run()

	return room
}

func (rm *roomManager) GetRoom(roomID string) *Room {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()
	return rm.rooms[roomID]
}

func (rm *roomManager) JoinRoom(roomID string, sessionID string, client Client) (*Room, int, error) {
	room := rm.GetRoom(roomID)
	if room == nil {
		room = rm.CreateRoom(roomID)
	}

	room.Mutex.Lock()
	defer room.Mutex.Unlock()

	if room.EmptyTimer != nil {
		room.EmptyTimer.Stop()
		room.EmptyTimer = nil
		slog.Info("Room empty timer stopped", "event", "room_timer_stopped", "room_id", roomID)
	}

	// 1. Check for reconnect
	if sessionID != "" {
		if room.Player1Session == sessionID {
			room.Clients[client] = 1
			slog.Info("Client reconnected", "event", "client_reconnected", "room_id", roomID, "player_id", 1)
			return room, 1, nil
		}
		if room.Player2Session == sessionID {
			room.Clients[client] = 2
			slog.Info("Client reconnected", "event", "client_reconnected", "room_id", roomID, "player_id", 2)
			return room, 2, nil
		}
	}

	// 2. Not reconnecting, assign new slot if available
	if len(room.Clients) >= 2 || (room.Player1Session != "" && room.Player2Session != "") {
		return nil, 0, nil // Room full
	}

	playerID := 1
	if room.Player1Session != "" {
		playerID = 2
	}
	
	room.Clients[client] = playerID
	if playerID == 1 {
		room.Player1Session = sessionID
	} else {
		room.Player2Session = sessionID
	}
	
	slog.Info("Client joined", "event", "client_joined", "room_id", roomID, "player_id", playerID)
	
	return room, playerID, nil
}

func (rm *roomManager) LeaveRoom(roomID string, client Client) {
	room := rm.GetRoom(roomID)
	if room != nil {
		room.Mutex.Lock()
		delete(room.Clients, client)
		count := len(room.Clients)
		room.Mutex.Unlock()

		if count == 0 {
			slog.Info("Room is empty, starting destroy timer", "event", "room_empty", "room_id", roomID, "timeout_min", rm.emptyTimeout.Minutes())
			room.EmptyTimer = time.AfterFunc(rm.emptyTimeout, func() {
				rm.mutex.Lock()
				defer rm.mutex.Unlock()
				
				// Re-check if room is still empty
				room.Mutex.Lock()
				currentCount := len(room.Clients)
				room.Mutex.Unlock()
				
				if currentCount == 0 {
					delete(rm.rooms, roomID)
					close(room.Quit)
					slog.Info("Room destroyed due to timeout", "event", "room_destroyed", "room_id", roomID)
				}
			})
		}
	}
}
