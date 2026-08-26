package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/dots-game/backend/internal/config"
	"github.com/dots-game/backend/internal/game"
	"github.com/dots-game/backend/internal/handler"
	"github.com/dots-game/backend/internal/service"
	"github.com/joho/godotenv"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	// Load .env if present (ignore error if not found, since Docker handles env vars)
	_ = godotenv.Load("../.env")

	cfg := config.Load()

	// Dependency Injection
	roomManager := service.NewRoomManager()
	gameLogic := game.NewGameLogic(cfg.BoardWidth, cfg.BoardHeight)

	// Routes
	http.HandleFunc("/ws", handler.ServeWS(roomManager, gameLogic, cfg.BoardWidth, cfg.BoardHeight))
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
