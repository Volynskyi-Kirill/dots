package config

import (
	"log"
	"os"
	"strconv"
)

type Config struct {
	ServerPort  string
	BoardWidth  int
	BoardHeight int
}

func Load() *Config {
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	bw := os.Getenv("BOARD_WIDTH")
	boardWidth := 39
	if bw != "" {
		if val, err := strconv.Atoi(bw); err == nil {
			boardWidth = val
		}
	}

	bh := os.Getenv("BOARD_HEIGHT")
	boardHeight := 39
	if bh != "" {
		if val, err := strconv.Atoi(bh); err == nil {
			boardHeight = val
		}
	}

	log.Printf("Loaded config: Port=%s, Board=%dx%d", port, boardWidth, boardHeight)

	return &Config{
		ServerPort:  port,
		BoardWidth:  boardWidth,
		BoardHeight: boardHeight,
	}
}
