# Dots Game — System Architecture & Knowledge Base

This document serves as the master reference for the game's architecture, business logic, algorithms, and data flow.

## 1. Technical Stack
*   **Backend**: Go (Golang)
    *   WebSocket handling via `gorilla/websocket`.
    *   No persistent database (in-memory state).
*   **Frontend**: React 18, TypeScript, Vite.
    *   Styling: Tailwind CSS, `shadcn/ui` concepts.
    *   Rendering: HTML5 Canvas (`<canvas>`) inside a React component (`GameBoard.tsx`).
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

## 3. Core Game Logic (`backend/internal/game/logic.go`)

### The Grid
*   Fixed 39x39 grid (`constants.Empty=0`, `constants.Player1=1`, `constants.Player2=2`).

### Capture Algorithm (Flood-Fill)
When a dot is placed, the backend checks for enclosures:
1.  **BFS / Flood Fill**: We initiate a Breadth-First Search from empty or enemy dots adjacent to the newly placed dot.
2.  **Boundary Detection**: The BFS stops when it hits the current player's dots. If the BFS cannot reach the edge of the board (39x39 limits), the area is considered **captured**.
3.  **Dead Dots Rule**: Enemy dots that were already captured in previous turns (`CapturedP1` / `CapturedP2`) are treated as "transparent/empty" space during BFS. They cannot act as boundary walls for new captures.
4.  **Polygon Generation**: To draw the neon boundary, the outer dots forming the enclosure are extracted. They are sorted by angle relative to their centroid (`orderBoundaryPoints`) so the frontend can draw a clean, continuous `lineTo` polygon without crisscrossing lines.

### Undo Mechanism (State Rebuilding)
Because reversing flood-fills and un-capturing territories is mathematically complex and prone to edge-case bugs, the Undo system uses **Event Sourcing**:
*   The backend maintains a chronological `MovesHistory` array of all placed dots.
*   When an Undo is approved, the backend pops the last move.
*   It then completely wipes the board state to zero and replays `MakeMove()` sequentially for all remaining moves in the history.
*   *Performance*: 1500 iterations of a Go function take fractions of a millisecond, guaranteeing a 100% bug-free state restoration.

### Game Flow, Timers & Series
*   **Blitz Mode (Timers)**: When creating a room, users can enable chess-style timers (Initial Time + Increment per move).
    *   The frontend uses `requestAnimationFrame` for a smooth local countdown.
    *   The backend governs the absolute truth using `LastMoveTime` and a background goroutine in `websocket.go` that constantly monitors for timeouts.
    *   During an `Undo`, the timer states (`TimeP1` and `TimeP2`) are flawlessly restored to the exact millisecond using snapshots stored inside `MovesHistory`.
*   **Game Over Conditions**:
    *   **Timeout**: Governed by the backend goroutine.
    *   **Surrender**: Player manually concedes via UI.
    *   **Board Full**: Triggered automatically when all 1521 intersections are occupied. The system counts captured points to determine the winner.
*   **Rematch & Series Tracking**: After a game concludes, players can agree to a rematch. The backend tracks the Series Score, clears the board, and automatically swaps the `StartingPlayer` so the loser (or whoever went second) gets to open the next match.

---

## 4. Frontend Rendering (`GameBoard.tsx`)

### Canvas Interactions & Camera
*   **Desktop**: The board centers automatically. Users can pan using mouse drag (or touch) and zoom via scroll wheel (or pinch).
*   **Mobile**: 
    *   Native multi-touch pinch-to-zoom is supported using pinch centroid math.
    *   Panning is constrained with margins so the board cannot be dragged off-screen.

### Mobile & Touch UX (Control Schemes)
To solve the classic "fat finger" problem on large grids (39x39), the game offers three UX control schemes (stored in `localStorage: dots_control_scheme`):
1. **Classic (Direct Tap)**: Default mode. Single tap instantly places a dot. 1-finger pans the board.
2. **Smart Aim (Drag & Release)**: Touch and drag creates a glowing ghost dot offset 40px *above* the finger. The dot magnetically snaps to grid intersections, allowing pixel-perfect precision without zooming in. Releasing the finger places the dot. 2-fingers are used for panning. On desktop, this mode attaches a hover-reticle to the mouse cursor.
3. **Double Tap (Confirm)**: Tapping an intersection selects it (showing a yellow marker) and brings up a "Confirm Move" button. Tapping the same spot again or clicking the button finalizes the move.

*Note: In `Smart Aim` and `Double Tap` modes, the aiming visuals and inputs are strictly disabled during the opponent's turn to prevent UI clutter and invalid actions.*

### Visuals & HUD
*   **Theme**: Dark mode, minimal aesthetics, glowing neon accents.
*   **Last Move Indicator**: The very last dot placed has a distinct white core and a stronger neon drop-shadow.
*   **HUD**: The header contains live score tracking, timers, and Undo handshake UI. Mobile users have a burger menu containing settings, share links, and the series score.

---

## 5. File Structure Map

```text
├── Makefile                     # Dev/Prod docker commands
├── docker-compose.yml           # Local dev environment
├── docker-compose.prod.yml      # Production orchestration
├── backend/
│   ├── cmd/server/main.go       # HTTP server setup
│   ├── internal/
│   │   ├── constants/           # Enums, Player IDs, WS message types
│   │   ├── domain/models.go     # GameState, Payloads JSON definitions
│   │   ├── game/logic.go        # The "Brain" (BFS, Polygons, Replay)
│   │   ├── handler/websocket.go # WS Router, Undo Handshakes
│   │   └── service/room_manager.go # Session routing, Room creation
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main UI layout, Modals, State wiring
│   │   ├── components/
│   │   │   └── GameBoard.tsx    # Canvas rendering, touch math
│   │   └── services/
│   │       └── websocket.ts     # WS Client, reconnects, localStorage ID
```
