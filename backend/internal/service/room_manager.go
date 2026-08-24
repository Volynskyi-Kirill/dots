package service

import (
	"log"
	"sync"
)

type Client interface {
	GetID() string
	Send(message []byte)
}

type Room struct {
	ID       string
	Clients  map[Client]int // map Client -> PlayerID (1 or 2)
	Mutex    sync.Mutex
	Broadcast chan []byte
}

type RoomManager interface {
	CreateRoom(roomID string) *Room
	GetRoom(roomID string) *Room
	JoinRoom(roomID string, client Client) (*Room, int, error)
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
	}
	rm.rooms[roomID] = room

	go func() {
		for msg := range room.Broadcast {
			room.Mutex.Lock()
			for client := range room.Clients {
				client.Send(msg)
			}
			room.Mutex.Unlock()
		}
	}()

	return room
}

func (rm *roomManager) GetRoom(roomID string) *Room {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()
	return rm.rooms[roomID]
}

func (rm *roomManager) JoinRoom(roomID string, client Client) (*Room, int, error) {
	room := rm.GetRoom(roomID)
	if room == nil {
		room = rm.CreateRoom(roomID)
	}

	room.Mutex.Lock()
	defer room.Mutex.Unlock()

	if len(room.Clients) >= 2 {
		return nil, 0, nil // Room full
	}

	playerID := 1
	for _, id := range room.Clients {
		if id == 1 {
			playerID = 2
		}
	}
	
	room.Clients[client] = playerID
	log.Printf("Client joined room %s as Player %d", roomID, playerID)
	
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
			log.Printf("Room %s destroyed", roomID)
		}
	}
}
