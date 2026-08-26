package config

import (
	"log/slog"
	"os"
	"strconv"

	"github.com/dots-game/backend/internal/constants"
)

type Config struct {
	ServerPort       string
	BoardWidth       int
	BoardHeight      int
	RoomEmptyTimeout int
	AllowedOrigin    string
}

func Load() *Config {
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	bw := os.Getenv("BOARD_WIDTH")
	boardWidth := 20
	if bw != "" {
		if val, err := strconv.Atoi(bw); err == nil {
			boardWidth = val
		}
	}

	bh := os.Getenv("BOARD_HEIGHT")
	boardHeight := 20
	if bh != "" {
		if val, err := strconv.Atoi(bh); err == nil {
			boardHeight = val
		}
	}

	timeout := constants.DefaultRoomEmptyTimeout
	if envVal := os.Getenv("ROOM_EMPTY_TIMEOUT"); envVal != "" {
		if parsed, err := strconv.Atoi(envVal); err == nil && parsed > 0 {
			timeout = parsed
		}
	}

	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")

	slog.Info("Loaded config", "port", port, "boardWidth", boardWidth, "boardHeight", boardHeight, "roomEmptyTimeout", timeout, "allowedOrigin", allowedOrigin)

	return &Config{
		ServerPort:       port,
		BoardWidth:       boardWidth,
		BoardHeight:      boardHeight,
		RoomEmptyTimeout: timeout,
		AllowedOrigin:    allowedOrigin,
	}
}
