# Dots Game — Detailed System Flow

This document explains the general flow of the game, dependency interactions, and specific non-obvious implementations such as unique ID generation and reconnection logic.

## 1. Session Initialization and Reconnection

### Session ID Generation (`tochky/lib/websocket.ts`)
- **Generation:** When a user opens the web application, `WSService` checks for a `dots_session_id` in `localStorage`. If it does not exist, a new pseudo-random unique ID is generated using `Math.random().toString(36)` and saved.
- **Persistence:** Because the ID is stored in `localStorage`, the user's session persists across page reloads and even browser restarts, as long as they don't clear their local storage.
- **Injection:** Every `join` payload sent over the WebSocket automatically injects this `sessionId`.

### Backend Room Connection (`backend/internal/service/room_manager.go`)
- **Reconnection Logic:** When the backend receives a `join` message, it checks the `sessionId`. If the `sessionId` matches `Player1Session` or `Player2Session` in the requested room, the backend bypasses normal matching and instantly reconnects the client to their existing `PlayerID`.
- **Disconnect Tracking:** 
  - When a WebSocket connection breaks, a `defer` block in `websocket.go` detects the drop and flags the corresponding player (`P1Disconnected` or `P2Disconnected`) as `true`.
  - The server starts a background countdown (15 seconds, governed by `DISCONNECT_TIMEOUT`). 
  - If the player reconnects in time with the same `sessionId`, the flag is cleared.
  - If the timer expires, the backend automatically concludes the match, awarding a win by `disconnect` to the remaining player.

## 2. General Game Flow

1. **Lobby/Home:** Player lands on the homepage. They can configure game settings (Timer, Control scheme, Theme).
2. **Room Creation:** Clicking "Play with friend" generates a new room route (e.g., `/room/xyz`).
3. **Waiting State:**
   - The first player to join a room becomes `Player 1`. 
   - Since the room is not full, the backend initializes the `GameState` but keeps `Status = "waiting"`.
   - The frontend displays a "Waiting for opponent" overlay featuring the room ID and easy copy/share links.
4. **Active Game:**
   - The second player visits the URL, joins the WebSocket room, and is assigned `Player 2`.
   - The backend upgrades `Status` to `"playing"` and broadcasts the new state.
   - The Waiting Overlay disappears and the timer starts (if enabled).
5. **Making Moves:**
   - When a player clicks/taps an intersection, the frontend calculates the nearest `(x, y)` grid coordinates.
   - It emits a `{"type": "move", "payload": {"x": X, "y": Y}}`.
   - The backend validates the move. If valid, it places the dot, runs the Breadth-First Search (BFS) polygon detection algorithm to find captures, and evaluates win conditions.
   - The updated `GameState` is broadcast to both clients, triggering a UI re-render.
6. **Game Over & Rematch:**
   - The game ends via board fill, surrender, timeout, or disconnect.
   - A `GameOverOverlay` displays the localized result.
   - Either player can request a rematch. If the opponent accepts, the backend flushes the board, retains the `MatchScore`, flips the starting player, and resets the state to `"playing"`.

## 3. Frontend-Backend Data Synchronization

- **Authoritative Backend:** The `GameState` struct in Golang (`domain/models.go`) is the absolute source of truth.
- **Dumb Frontend:** The React frontend maintains very little internal state. It mostly reacts to incoming `message_state` payloads from the WebSocket. 
- **Drawing Loop:** The `<canvas>` rendering logic (in `GameBoard.tsx`) uses a `requestAnimationFrame` style loop (`draw()` function triggered by `useEffect` dependencies). It re-draws the grid, dots, and polygons based strictly on the current `gameState` prop. Theme changes (Light/Dark mode) are passed into the canvas draw dependencies to ensure seamless repaints.

## 4. Key Dependencies

- **gorilla/websocket (Backend):** Handles WS upgrading and concurrent client I/O.
- **next-themes (Frontend):** Manages Light/Dark mode state and hydration cleanly.
- **next-intl (Frontend):** Handles localization (en, ru, uk, pl). Language switching updates the route (e.g., `/en/room/...` to `/ru/room/...`).
- **canvas-confetti (Frontend):** Used exclusively for drawing celebration confetti dynamically on the winning client's screen.
