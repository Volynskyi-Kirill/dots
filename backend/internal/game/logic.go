package game

import (
	"errors"
	"math"

	"sync"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
)

type Logic interface {
	MakeMove(state *domain.GameState, playerID int, x, y int) error
	RebuildState(state *domain.GameState)
	InitState(state *domain.GameState)
}

type gameLogic struct {
	boolGridPool *sync.Pool
}

func NewGameLogic() Logic {
	return &gameLogic{
		boolGridPool: &sync.Pool{
			New: func() interface{} {
				// Max possible size is 39x39 = 1521
				b := make([]bool, 1521)
				return &b
			},
		},
	}
}

func (l *gameLogic) MakeMove(state *domain.GameState, playerID int, x, y int) error {
	width := state.Settings.BoardWidth
	height := state.Settings.BoardHeight

	if state.Status != constants.StatusPlaying {
		return errors.New("game is not in playing state")
	}
	if state.CurrentTurn != playerID {
		return errors.New("not your turn")
	}
	if x < 0 || x >= width || y < 0 || y >= height {
		return errors.New("out of bounds")
	}
	if state.Board[y][x] != constants.Empty {
		return errors.New("cell already occupied")
	}

	if l.isCaptured(state, x, y) {
		return errors.New("cannot place dot in captured area")
	}

	state.Board[y][x] = playerID
	state.LastMove = &domain.Point{X: x, Y: y}
	state.ConsecutivePasses = 0

	l.detectCaptures(state, playerID, x, y)

	if state.CurrentTurn == constants.Player1 {
		state.CurrentTurn = constants.Player2
	} else {
		state.CurrentTurn = constants.Player1
	}

	return nil
}

func (l *gameLogic) isCaptured(state *domain.GameState, x, y int) bool {
	for _, capP := range state.CapturedP1 {
		if capP.X == x && capP.Y == y {
			return true
		}
	}
	for _, capP := range state.CapturedP2 {
		if capP.X == x && capP.Y == y {
			return true
		}
	}
	return false
}

// orderBoundaryPoints uses a Nearest Neighbor algorithm to sort boundary dots,
// forming a clean perimeter path and preventing self-intersecting jagged edges.
func orderBoundaryPoints(pts []domain.Point) []domain.Point {
	if len(pts) <= 1 {
		return pts
	}

	ordered := make([]domain.Point, 0, len(pts))
	visited := make(map[domain.Point]bool)

	// Start with the top-left-most point to ensure deterministic start
	curr := pts[0]
	for _, p := range pts[1:] {
		if p.Y < curr.Y || (p.Y == curr.Y && p.X < curr.X) {
			curr = p
		}
	}

	ordered = append(ordered, curr)
	visited[curr] = true

	for len(ordered) < len(pts) {
		var next domain.Point
		found := false
		minDist := math.MaxFloat64

		for _, p := range pts {
			if visited[p] {
				continue
			}

			dx := float64(p.X - curr.X)
			dy := float64(p.Y - curr.Y)
			dist := dx*dx + dy*dy

			if dist < minDist {
				minDist = dist
				next = p
				found = true
			}
		}

		if !found {
			break
		}

		curr = next
		ordered = append(ordered, curr)
		visited[curr] = true
	}

	return ordered
}

func (l *gameLogic) detectCaptures(state *domain.GameState, playerID int, startX, startY int) {
	width := state.Settings.BoardWidth
	height := state.Settings.BoardHeight

	opponentID := constants.Player1
	if playerID == constants.Player1 {
		opponentID = constants.Player2
	}

	dirs := []domain.Point{{X: 0, Y: -1}, {X: 0, Y: 1}, {X: -1, Y: 0}, {X: 1, Y: 0}}
	checkDirs := []domain.Point{
		{X: -1, Y: -1}, {X: 0, Y: -1}, {X: 1, Y: -1},
		{X: -1, Y: 0}, {X: 1, Y: 0},
		{X: -1, Y: 1}, {X: 0, Y: 1}, {X: 1, Y: 1},
	}

	getGrid := func() []bool {
		bPtr := l.boolGridPool.Get().(*[]bool)
		b := (*bPtr)[:width*height]
		for i := range b {
			b[i] = false
		}
		return b
	}
	putGrid := func(b []bool) {
		l.boolGridPool.Put(&b)
	}

	capturedGrid := getGrid()
	defer putGrid(capturedGrid)
	for _, p := range state.CapturedP1 {
		capturedGrid[p.Y*width+p.X] = true
	}
	for _, p := range state.CapturedP2 {
		capturedGrid[p.Y*width+p.X] = true
	}

	globalVisited := getGrid()
	defer putGrid(globalVisited)

	queue := make([]domain.Point, 0, 128)
	capPoints := make([]domain.Point, 0, 128)
	rawBoundary := make([]domain.Point, 0, 128)

	for _, cd := range checkDirs {
		nx, ny := startX+cd.X, startY+cd.Y
		startPt := domain.Point{X: nx, Y: ny}

		if nx < 0 || nx >= width || ny < 0 || ny >= height {
			continue
		}

		startIdx := ny*width + nx
		if globalVisited[startIdx] {
			continue
		}

		if state.Board[ny][nx] == playerID {
			continue
		}

		if capturedGrid[startIdx] {
			continue
		}

		queue = queue[:0]
		queue = append(queue, startPt)

		regionVisited := getGrid()
		boundary := getGrid()
		escaped := false
		hasOpponent := false

		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]

			if curr.X < 0 || curr.X >= width || curr.Y < 0 || curr.Y >= height {
				escaped = true
				continue
			}

			idx := curr.Y*width + curr.X
			if regionVisited[idx] {
				continue
			}
			regionVisited[idx] = true
			globalVisited[idx] = true

			if state.Board[curr.Y][curr.X] == opponentID {
				hasOpponent = true
			}

			for _, d := range dirs {
				adjX, adjY := curr.X+d.X, curr.Y+d.Y
				adj := domain.Point{X: adjX, Y: adjY}

				if adjX < 0 || adjX >= width || adjY < 0 || adjY >= height {
					queue = append(queue, adj)
					continue
				}

				adjIdx := adjY*width + adjX
				if state.Board[adjY][adjX] == playerID && !capturedGrid[adjIdx] {
					boundary[adjIdx] = true
				} else {
					if !regionVisited[adjIdx] {
						queue = append(queue, adj)
					}
				}
			}
		}

		if !escaped && hasOpponent {
			// Find which grid represents the player's CURRENT captured points
			// to avoid duplicating points that player already owns.
			myCapturedGrid := getGrid()
			if playerID == constants.Player1 {
				for _, p := range state.CapturedP1 {
					myCapturedGrid[p.Y*width+p.X] = true
				}
			} else {
				for _, p := range state.CapturedP2 {
					myCapturedGrid[p.Y*width+p.X] = true
				}
			}

			capPoints = capPoints[:0]
			for y := 0; y < height; y++ {
				for x := 0; x < width; x++ {
					if regionVisited[y*width+x] {
						if !myCapturedGrid[y*width+x] {
							capPoints = append(capPoints, domain.Point{X: x, Y: y})
						}
					}
				}
			}
			putGrid(myCapturedGrid)

			rawBoundary = rawBoundary[:0]
			for y := 0; y < height; y++ {
				for x := 0; x < width; x++ {
					if boundary[y*width+x] {
						rawBoundary = append(rawBoundary, domain.Point{X: x, Y: y})
					}
				}
			}

			orderedBoundary := orderBoundaryPoints(rawBoundary)

			if playerID == constants.Player1 {
				state.CapturedP1 = append(state.CapturedP1, capPoints...)
				state.PolygonsP1 = append(state.PolygonsP1, orderedBoundary)

				var newCapP2 []domain.Point
				for _, p := range state.CapturedP2 {
					if !regionVisited[p.Y*width+p.X] {
						newCapP2 = append(newCapP2, p)
					}
				}
				state.CapturedP2 = newCapP2

			} else {
				state.CapturedP2 = append(state.CapturedP2, capPoints...)
				state.PolygonsP2 = append(state.PolygonsP2, orderedBoundary)

				var newCapP1 []domain.Point
				for _, p := range state.CapturedP1 {
					if !regionVisited[p.Y*width+p.X] {
						newCapP1 = append(newCapP1, p)
					}
				}
				state.CapturedP1 = newCapP1

			}
		}

		putGrid(regionVisited)
		putGrid(boundary)
	}
}

func (l *gameLogic) InitState(state *domain.GameState) {
	width := state.Settings.BoardWidth
	height := state.Settings.BoardHeight

	// Clear board
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			state.Board[y][x] = constants.Empty
		}
	}

	// Add starting 2x2 diagonal cross near the center
	cx := (width - 1) / 2
	cy := (height - 1) / 2

	// Top-left: Player 1, Top-right: Player 2
	// Bottom-left: Player 2, Bottom-right: Player 1
	state.Board[cy][cx] = constants.Player1
	state.Board[cy][cx+1] = constants.Player2
	state.Board[cy+1][cx] = constants.Player2
	state.Board[cy+1][cx+1] = constants.Player1

	// Clear slices
	state.CapturedP1 = nil
	state.CapturedP2 = nil
	state.PolygonsP1 = nil
	state.PolygonsP2 = nil

	if state.StartingPlayer == 0 {
		state.StartingPlayer = constants.Player1
	}
	state.CurrentTurn = state.StartingPlayer
	state.LastMove = nil
	state.ConsecutivePasses = 0

	// Timer reset
	if state.Settings.TimerEnabled {
		state.TimeP1 = state.Settings.InitialTime
		state.TimeP2 = state.Settings.InitialTime
		// LastMoveTime will be set on the first move
	}
}

func (l *gameLogic) RebuildState(state *domain.GameState) {
	// Reset board to initial cross
	l.InitState(state)

	// Replay history
	history := state.MovesHistory
	state.MovesHistory = nil // Not strictly necessary since MakeMove doesn't modify it, but good practice
	for _, p := range history {
		// Ignore errors during replay since they were already validated
		_ = l.MakeMove(state, state.CurrentTurn, p.X, p.Y)
	}
	state.MovesHistory = history

	// Restore exact timer state from the last move (if timers enabled)
	if state.Settings.TimerEnabled && len(history) > 0 {
		lastMove := history[len(history)-1]
		state.TimeP1 = lastMove.TimeP1
		state.TimeP2 = lastMove.TimeP2
	}
}
