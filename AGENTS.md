This is a real-time multiplayer "Dots" game (точка).

## Essential Reading
Before making any architectural changes or implementing complex game features, you **MUST** read the system architecture document:
- [System Architecture & Knowledge Base](docs/architecture.md)

## Key Technical Constraints (Global)
1. **State Management**: The game state is completely authoritative on the backend. The frontend is primarily a visualization layer.
2. **Sessions**: The frontend passes a `sessionId` (stored in `localStorage`) inside the WebSocket `join` event. The backend uses this to uniquely identify players across page reloads and connections, returning a `MessageWelcome` with their assigned `playerId`.
3. **Migration Info**: We are actively migrating the frontend to Next.js in the [`tochky/`](./tochky/) directory.
   - For backend-specific rules, refer to [backend/AGENTS.md](./backend/AGENTS.md).
   - For frontend-specific rules, refer to [tochky/AGENTS.md](./tochky/AGENTS.md).

Please abide by these guidelines when modifying the codebase.
