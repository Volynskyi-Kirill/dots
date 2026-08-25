# Backend Game Logic & Architecture

This document describes the Go backend architecture, the game brain (BFS, Undo), and timers.

## Core Game Logic (`internal/game/logic.go`)

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
    *   The backend governs the absolute truth using `LastMoveTime` and a background goroutine in `websocket.go` that constantly monitors for timeouts.
    *   During an `Undo`, the timer states (`TimeP1` and `TimeP2`) are flawlessly restored to the exact millisecond using snapshots stored inside `MovesHistory`.
*   **Game Over Conditions**:
    *   **Timeout**: Governed by the backend goroutine.
    *   **Surrender**: Player manually concedes via UI.
    *   **Board Full**: Triggered automatically when all 1521 intersections are occupied. The system counts captured points to determine the winner.
*   **Rematch & Series Tracking**: After a game concludes, players can agree to a rematch. The backend tracks the Series Score, clears the board, and automatically swaps the `StartingPlayer` so the loser (or whoever went second) gets to open the next match.

## File Structure Map (Backend)

```text
backend/
├── cmd/server/main.go       # HTTP server setup
├── internal/
│   ├── constants/           # Enums, Player IDs, WS message types
│   ├── domain/models.go     # GameState, Payloads JSON definitions
│   ├── game/logic.go        # The "Brain" (BFS, Polygons, Replay)
│   ├── handler/websocket.go # WS Router, Undo Handshakes
│   └── service/room_manager.go # Session routing, Room creation
```
