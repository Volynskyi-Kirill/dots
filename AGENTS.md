This is a real-time multiplayer "Dots" game (точка).

## Essential Reading
Before making any architectural changes or implementing complex game features, you **MUST** read the system architecture document:
- [System Architecture & Knowledge Base](docs/architecture.md)

## Key Technical Constraints
1. **State Management**: The game state is completely authoritative on the backend. The frontend is primarily a visualization layer.
2. **Game Logic**: All complex logic (captures, BFS, polygons) is strictly in Go (`backend/internal/game/logic.go`). 
3. **Undo Feature**: Do NOT write logic to "reverse" a capture. If a move is undone, we use the Event Sourcing pattern to pop the move from `MovesHistory`, clear the board, and replay the history using `logic.RebuildState`.
4. **Sessions**: The frontend passes a `sessionId` (stored in `localStorage`) inside the WebSocket `join` event. The backend uses this to uniquely identify players across page reloads and connections, returning a `MessageWelcome` with their assigned `playerId`.
5. **UI Framework & Migration**: The legacy frontend is in `frontend/` (React + Vite + TailwindCSS + lucide-react). We are actively migrating the frontend to Next.js in the [`tochky/`](./tochky/) directory (Next.js App Router + next-intl + shadcn/ui). For Next.js-specific rules, refer to [tochky/AGENTS.md](./tochky/AGENTS.md).

Please abide by these guidelines when modifying the codebase.

