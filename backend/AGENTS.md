## Backend Specific Guidelines

1. **Game Logic**: All complex logic (captures, BFS, polygons) is strictly in Go (`internal/game/logic.go`).
2. **Undo Feature**: Do NOT write logic to "reverse" a capture. If a move is undone, we use the Event Sourcing pattern to pop the move from `MovesHistory`, clear the board, and replay the history using `logic.RebuildState`.
