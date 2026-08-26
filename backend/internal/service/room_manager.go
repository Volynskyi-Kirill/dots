package service

import (
	"log/slog"
	"sync"

	"github.com/dots-game/backend/internal/domain"
)

type Client interface {
	GetID() string
	Send(message []byte)
}

type Room struct {
	ID             string
	Clients        map[Client]int // map Client -> PlayerID (1 or 2)
	Player1Session string
	Player2Session string
	Mutex          sync.Mutex
	Broadcast      chan []byte
	Quit           chan struct{}

	State      *domain.GameState
	StateMutex sync.RWMutex
}

type RoomManager interface {
	CreateRoom(roomID string) *Room
	GetRoom(roomID string) *Room
	JoinRoom(roomID string, sessionID string, client Client) (*Room, int, error)
	LeaveRoom(roomID string, client Client)
}

type roomManager struct {
	rooms map[string]*Room
	mutex sync.Mutex
}

func NewRoomManager() RoomManager {
	return &roomManager{
		rooms: make(map[string]*Room),
	}
}

func (rm *roomManager) CreateRoom(roomID string) *Room {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	room := &Room{
		ID:        roomID,
		Clients:   make(map[Client]int),
		Broadcast: make(chan []byte),
		Quit:      make(chan struct{}),
	}
	rm.rooms[roomID] = room

	slog.Info("Room created", "event", "room_created", "room_id", roomID)

	go func() {
		for {
			select {
			case msg := <-room.Broadcast:
				room.Mutex.Lock()
				for client := range room.Clients {
					client.Send(msg)
				}
				room.Mutex.Unlock()
			case <-room.Quit:
				return
			}
		}
	}()

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
			rm.mutex.Lock()
			delete(rm.rooms, roomID)
			rm.mutex.Unlock()
			close(room.Quit)
			slog.Info("Room destroyed", "event", "room_destroyed", "room_id", roomID)
		}
	}
}
