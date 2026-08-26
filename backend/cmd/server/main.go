package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/dots-game/backend/internal/config"
	"github.com/dots-game/backend/internal/game"
	"github.com/dots-game/backend/internal/handler"
	"github.com/dots-game/backend/internal/logger"
	"github.com/dots-game/backend/internal/service"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if present
	_ = godotenv.Load("../.env")

	// 1. Setup Logger
	_, cleanupLogger := logger.Setup()
	defer cleanupLogger()

	// 2. Load Config
	cfg := config.Load()

	// 3. Dependency Injection
	gameLogic := game.NewGameLogic()
	roomManager := service.NewRoomManager(gameLogic, cfg.RoomEmptyTimeout)

	// 4. Routes
	http.HandleFunc("/ws", handler.ServeWS(roomManager, cfg))
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	slog.Info("Server starting", "event", "server_start", "port", cfg.ServerPort)
	if err := http.ListenAndServe(":"+cfg.ServerPort, nil); err != nil {
		slog.Error("Server failed to start", "event", "server_error", "error", err)
		os.Exit(1)
	}
}
