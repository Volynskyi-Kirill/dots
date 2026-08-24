package game

import (
	"errors"
	"math"
	"sort"

	"github.com/dots-game/backend/internal/constants"
	"github.com/dots-game/backend/internal/domain"
)

type Logic interface {
	MakeMove(state *domain.GameState, playerID int, x, y int) error
}

type gameLogic struct {
	width  int
	height int
}

func NewGameLogic(width, height int) Logic {
	return &gameLogic{
		width:  width,
		height: height,
	}
}

func (l *gameLogic) MakeMove(state *domain.GameState, playerID int, x, y int) error {
	if state.Status != "playing" {
		return errors.New("game is not in playing state")
	}
	if state.CurrentTurn != playerID {
		return errors.New("not your turn")
	}
	if x < 0 || x >= l.width || y < 0 || y >= l.height {
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

// orderBoundaryPoints sorts boundary points by traversal order / angle around their centroid
// to form a neat consecutive polygon supporting diagonal and orthogonal connections.
func orderBoundaryPoints(pts []domain.Point) []domain.Point {
	if len(pts) <= 3 {
		return pts
	}

	// Calculate center
	var sumX, sumY float64
	for _, p := range pts {
		sumX += float64(p.X)
		sumY += float64(p.Y)
	}
	centerX := sumX / float64(len(pts))
	centerY := sumY / float64(len(pts))

	// Sort points by angle around centroid
	type angledPoint struct {
		p     domain.Point
		angle float64
		dist  float64
	}
	angled := make([]angledPoint, len(pts))
	for i, p := range pts {
		dx := float64(p.X) - centerX
		dy := float64(p.Y) - centerY
		angled[i] = angledPoint{
			p:     p,
			angle: math.Atan2(dy, dx),
			dist:  dx*dx + dy*dy,
		}
	}

	sort.Slice(angled, func(i, j int) bool {
		if angled[i].angle == angled[j].angle {
			return angled[i].dist < angled[j].dist
		}
		return angled[i].angle < angled[j].angle
	})

	ordered := make([]domain.Point, len(pts))
	for i, ap := range angled {
		ordered[i] = ap.p
	}
	return ordered
}

func (l *gameLogic) detectCaptures(state *domain.GameState, playerID int, startX, startY int) {
	opponentID := constants.Player1
	if playerID == constants.Player1 {
		opponentID = constants.Player2
	}

	// 4-way directions for flood fill escape check
	dirs := []domain.Point{{X: 0, Y: -1}, {X: 0, Y: 1}, {X: -1, Y: 0}, {X: 1, Y: 0}}

	// 8-way directions to check all neighbors around the placed dot
	checkDirs := []domain.Point{
		{X: -1, Y: -1}, {X: 0, Y: -1}, {X: 1, Y: -1},
		{X: -1, Y: 0},                 {X: 1, Y: 0},
		{X: -1, Y: 1},  {X: 0, Y: 1},  {X: 1, Y: 1},
	}

	globalVisited := make(map[domain.Point]bool)

	for _, cd := range checkDirs {
		nx, ny := startX+cd.X, startY+cd.Y
		startPt := domain.Point{X: nx, Y: ny}

		if nx < 0 || nx >= l.width || ny < 0 || ny >= l.height {
			continue
		}

		if globalVisited[startPt] {
			continue
		}

		if state.Board[ny][nx] == playerID {
			continue // Own boundary
		}

		if l.isCaptured(state, nx, ny) {
			continue
		}

		// BFS
		queue := []domain.Point{startPt}
		regionVisited := make(map[domain.Point]bool)
		boundary := make(map[domain.Point]bool)
		escaped := false
		hasOpponent := false

		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]

			if curr.X < 0 || curr.X >= l.width || curr.Y < 0 || curr.Y >= l.height {
				escaped = true
				continue
			}

			if regionVisited[curr] {
				continue
			}
			regionVisited[curr] = true
			globalVisited[curr] = true

			if state.Board[curr.Y][curr.X] == opponentID {
				hasOpponent = true
			}

			for _, d := range dirs {
				adjX, adjY := curr.X+d.X, curr.Y+d.Y
				adj := domain.Point{X: adjX, Y: adjY}

				if adjX < 0 || adjX >= l.width || adjY < 0 || adjY >= l.height {
					queue = append(queue, adj)
					continue
				}

				if state.Board[adjY][adjX] == playerID {
					boundary[adj] = true
				} else {
					if !regionVisited[adj] {
						queue = append(queue, adj)
					}
				}
			}
		}

		if !escaped && hasOpponent {
			// Valid capture
			var capPoints []domain.Point
			for p := range regionVisited {
				capPoints = append(capPoints, p)
			}

			var rawBoundary []domain.Point
			for p := range boundary {
				rawBoundary = append(rawBoundary, p)
			}

			orderedBoundary := orderBoundaryPoints(rawBoundary)

			if playerID == constants.Player1 {
				state.CapturedP1 = append(state.CapturedP1, capPoints...)
				state.PolygonsP1 = append(state.PolygonsP1, orderedBoundary)
			} else {
				state.CapturedP2 = append(state.CapturedP2, capPoints...)
				state.PolygonsP2 = append(state.PolygonsP2, orderedBoundary)
			}
		}
	}
}
