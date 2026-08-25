# Dots Game — System Architecture & Knowledge Base

This document serves as the master reference for the game's architecture, business logic, algorithms, and data flow.

## 1. Technical Stack
*   **Backend**: Go (Golang)
    *   WebSocket handling via `gorilla/websocket`.
    *   No persistent database (in-memory state).
*   **Frontend**: Next.js (App Router), React 19, TypeScript
    *   Styling: Tailwind CSS v4, `shadcn/ui` components.
    *   Rendering: HTML5 Canvas (`<canvas>`) inside a React component (`GameBoard.tsx`).
    *   Internationalization: `next-intl`.
*   **DevOps / Infrastructure**:
    *   See the detailed infrastructure breakdown in [infrastructure.md](./infrastructure.md).

---

## 2. Multiplayer & Networking

### Architecture
The game operates on an **authoritative server model**. The frontend is a "dumb" client that renders the state received from the backend and sends user actions (clicks).

### Session & Reconnects
*   **Identity**: Frontend generates a unique `sessionId` and saves it in `localStorage`.
*   **Join Flow**:
    1.  Client connects via WS and sends `{"type": "join", "payload": {"roomId": "xxx", "sessionId": "yyy"}}`.
    2.  `RoomManager` checks if `sessionId` matches an existing disconnected player. If so, they seamlessly reconnect and reclaim their `PlayerID`.
    3.  If it's a new session and the room has space, they are assigned `Player 1` or `Player 2`.
    4.  Backend replies directly to the client with `{"type": "welcome", "payload": {"playerId": X}}`.
*   **State Sync**: After any state change (join, move, undo), the backend broadcasts the full JSON `GameState` to both players.

---

## 3. Sub-domain Documentation

Detailed architecture for specific domains can be found here:
- **System Flow & Dependencies**: See [`docs/game_flow.md`](./game_flow.md)
- **Backend Game Logic (BFS, Event Sourcing, Timers)**: See [`backend/docs/README.md`](../backend/docs/README.md)
- **Frontend Rendering (Canvas, Touch UX, UI)**: See [`tochky/docs/README.md`](../tochky/docs/README.md)

---

## 4. Security & Protections
*   **CORS**: Restricted via `ALLOWED_ORIGIN` environment variable.
*   **Payload Limits**: WebSocket connections enforce a strict 8KB read limit to prevent memory exhaustion attacks.
*   **Authoritative Validation**: All moves, undo requests, and timers are strictly validated on the backend.

---

## 5. Root File Structure Map

```text
├── Makefile                     # Dev/Prod docker commands
├── docker-compose.yml           # Local dev environment
├── docker-compose.prod.yml      # Production orchestration
├── docs/                        # Root documentation (Infra & Architecture)
├── backend/                     # Go Server (See backend/docs/)
└── tochky/                      # Next.js Frontend (See tochky/docs/)
```
