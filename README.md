*[Читать на русском](README.ru.md)*

# Dots Game

A browser-based multiplayer strategic game "Dots" featuring classic rules, a modern minimalist design, and responsive controls.

## 🌟 Features

- **Full Multiplayer:** Real-time gameplay via WebSocket.
- **Classic Rules:** Captures territory using a Flood-Fill algorithm.
- **Adaptive Canvas:** Support for Multi-touch gestures (pinch-to-zoom and pan) on mobile, and fixed grids on PC.
- **Modern UI/UX:** Built with Next.js App Router, Tailwind CSS v4, and shadcn/ui. Fully localized via `next-intl`.
- **Clean Architecture:** Game logic in Go is fully isolated from the frontend WebSocket layer.

## 🛠 Tech Stack

- **Backend:** Go (Golang), `gorilla/websocket`, custom BFS algorithms.
- **Frontend:** Next.js (React 19), TypeScript, Tailwind CSS, shadcn/ui, HTML5 Canvas.
- **Infrastructure:** Docker Compose.

## 🚀 How to Run Locally

To run the project, you only need **Docker** and **Docker Compose** installed.

1. Clone the repository.
2. In the project root, run:
   ```bash
   make up
   ```
3. Open the application in your browser:
   - Game URL: [http://localhost:3000](http://localhost:3000)

### Useful Commands (Makefile)

- `make up` — start all containers in the background
- `make down` — stop and remove containers
- `make rebuild-frontend` — rebuild the Next.js frontend container
- `make logs` — view frontend and backend logs in real-time
- `make test` — run unit tests for the game logic algorithm (Go)


## 📚 Documentation

Detailed documentation is split by domain:

- **[Root Architecture & Infrastructure](./docs/)**: Overview of Docker setups, routing, and deployment.
- **[Backend Game Logic](./backend/docs/)**: Details on the BFS capture algorithm, Event Sourcing Undo, and Timers.
- **[Frontend Rendering](./tochky/docs/)**: Next.js routing, i18n, Canvas mathematics, and touch controls.

## 📁 Root Structure

```text
.
├── backend/                  # Go server (API & Game Logic)
├── tochky/                   # Next.js frontend (UI & Canvas)
├── docs/                     # General infrastructure documentation
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production environment
└── Makefile                  # Quick terminal commands
```
