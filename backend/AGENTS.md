## Backend Specific Guidelines

1. **Game Logic**: All complex logic (captures, BFS, polygons) is strictly in Go (`internal/game/logic.go`).
2. **Undo Feature**: Do NOT write logic to "reverse" a capture. If a move is undone, we use the Event Sourcing pattern to pop the move from `MovesHistory`, clear the board, and replay the history using `logic.RebuildState`.
3. **Concurrency & State Management**: NEVER use global maps/variables to store game states. `GameState` must be encapsulated within a `Room` struct and all reads/writes must be protected by a `sync.RWMutex`.
4. **Memory Optimization (GC)**: In hot paths (like BFS `detectCaptures` which runs heavily during `RebuildState`), DO NOT allocate new maps or slices. Use `sync.Pool` with flat slices (e.g., `[]bool`) to achieve zero allocations and reduce GC pressure.
5. **Goroutine Lifecycles**: Any background goroutine (timers, broadcast loops) must be tied to a `Quit` channel (`chan struct{}`). Ensure they exit cleanly when a room is destroyed to prevent goroutine leaks.
6. **Code Cleanliness**: Keep websocket handlers clean. Do not write massive `switch` blocks in a single function. Use a router struct (like `wsSession`) and extract logic into specialized methods (e.g., `handleMove`, `handleJoin`).
7. **Constants & Magic Numbers**: Never use magic strings for statuses (`"playing"`, `"waiting"`) or magic numbers for grid sizes. Always use typed constants defined in the `constants` package and rely on dynamic `width/height`.
