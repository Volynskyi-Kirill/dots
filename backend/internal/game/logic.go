package game

import (
	"errors"

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

func (l *gameLogic) detectCaptures(state *domain.GameState, playerID int, startX, startY int) {
	opponentID := constants.Player1
	if playerID == constants.Player1 {
		opponentID = constants.Player2
	}

	// 4-way directions for flood fill
	dirs := []domain.Point{{X: 0, Y: -1}, {X: 0, Y: 1}, {X: -1, Y: 0}, {X: 1, Y: 0}}
	
	// 8-way directions to check all neighbors of the placed dot
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
			continue // It's our own boundary
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
					// Pushing out of bounds point to trigger escape
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
			// Found a valid capture!
			var capPoints []domain.Point
			for p := range regionVisited {
				capPoints = append(capPoints, p)
			}
			
			var boundPoints []domain.Point
			for p := range boundary {
				boundPoints = append(boundPoints, p)
			}

			if playerID == constants.Player1 {
				state.CapturedP1 = append(state.CapturedP1, capPoints...)
				state.PolygonsP1 = append(state.PolygonsP1, boundPoints)
			} else {
				state.CapturedP2 = append(state.CapturedP2, capPoints...)
				state.PolygonsP2 = append(state.PolygonsP2, boundPoints)
			}
		}
	}
}
