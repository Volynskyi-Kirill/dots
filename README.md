*[Читать на русском](README.ru.md)*

# Dots Game

A browser-based multiplayer strategic game "Dots" featuring classic rules, a modern minimalist design, and responsive controls.

## 🌟 Features

- **Full Multiplayer:** Real-time gameplay via WebSocket.
- **Classic Rules:** The algorithm strictly captures territory only if at least one enemy dot is enclosed within a closed boundary.
- **Adaptive Canvas:** 
  - On PC: A strictly fixed and automatically centered grid.
  - On Mobile: Support for Multi-touch gestures (pinch-to-zoom for scaling and drag to pan).
- **Modern UI/UX:** Dark/Light themes, soft neon glowing fills for captured bases, and convenient invite link copying.
- **Clean Architecture:** Game logic in Go is fully isolated from the WebSocket layer.

## 🛠 Tech Stack

**Backend:**
- Language: Go (Golang)
- Multiplayer: `gorilla/websocket`
- Architecture: Standard Project Layout, Dependency Injection
- Algorithms: Breadth-First Search (BFS) / Flood Fill on graphs for finding boundaries

**Frontend:**
- Framework: React + Vite + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- Rendering: HTML5 Canvas API

**Infrastructure:**
- Orchestration: Docker Compose
- Live Reload: `air` (Go) and Vite (React)

## 🚀 How to Run Locally

To run the project, you only need **Docker** and **Docker Compose** installed.

1. Clone the repository.
2. In the project root, run:
   ```bash
   make up
   # Or manually: docker-compose up -d --build
   ```
3. Open the application in your browser:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend (WS): `ws://localhost:8080/ws`

### Useful Commands (Makefile)

- `make up` — start all containers in the background
- `make down` — stop and remove containers
- `make restart` — restart containers
- `make logs` — view frontend and backend logs in real-time
- `make test` — run unit tests for the game logic algorithm (Go)
- `make share` — **expose the game to the internet using Ngrok**

## 🌐 How to Play with Friends Online

By default, the game only runs locally. To let a friend join you, you need to "tunnel" it through the internet.

1. Install [Ngrok](https://ngrok.com/download) and authenticate (run `ngrok config add-authtoken <YOUR_TOKEN>`).
2. Make sure the game is running (`make up`).
3. In a new terminal, run:
   ```bash
   make share
   ```
4. Ngrok will give you a green forwarding link like `https://1234-abcd.ngrok-free.app`.
5. Open that link, create a room, and send the final link to your friend! All requests (including WebSockets) will be automatically routed.

## 📁 Project Structure

```text
.
├── backend/                  # Go server
│   ├── cmd/server/           # Application entrypoint (main.go)
│   ├── internal/             # Isolated business logic
│   │   ├── config/           # .env variables parsing
│   │   ├── constants/        # Game constants
│   │   ├── domain/           # Data models (GameState, Point, etc.)
│   │   ├── game/             # Game algorithms (graph traversal, capturing)
│   │   ├── handler/          # WebSocket connection handlers
│   │   └── service/          # Room and player manager
│   ├── Dockerfile            # Development container (with air support)
│   └── .air.toml             # Hot Reload config
├── frontend/                 # React/Vite client
│   ├── src/
│   │   ├── components/       # UI components (GameBoard.tsx with Canvas)
│   │   ├── lib/              # Utilities
│   │   ├── services/         # WebSocket client (websocket.ts)
│   │   ├── App.tsx           # Routing and UI state
│   │   └── index.css         # Tailwind color palette (light/dark theme)
│   └── Dockerfile            # Node.js + Vite container
├── docker-compose.yml        # Environment orchestration
├── Makefile                  # Quick commands
└── .env                      # Basic environment variables
```

## 🎮 How to Play

1. Go to `http://localhost:5173`.
2. Click **"Create New Room"**.
3. Copy the link using the button in the top bar.
4. Send the link to a friend (or open it in Incognito mode to test yourself).
5. Take turns placing dots, trying to enclose your opponent's dots in a ring!
