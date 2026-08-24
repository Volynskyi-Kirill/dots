import { useState, useEffect } from 'react'
import { wsService } from './services/websocket'
import { GameBoard, GameState } from './components/GameBoard'
import { cn } from './lib/utils'

function App() {
  const [roomId, setRoomId] = useState('')
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    wsService.connect()

    const onState = (state: GameState) => {
      setGameState(state)
      setError(null)
    }

    const onError = (err: string) => {
      setError(err)
      setTimeout(() => setError(null), 3000)
    }

    wsService.on('state', onState)
    wsService.on('error', onError)

    return () => {
      wsService.off('state', onState)
      wsService.off('error', onError)
    }
  }, [])

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8)
    setJoinedRoom(newRoomId)
    wsService.send('join', { roomId: newRoomId })
  }

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      setJoinedRoom(roomId.trim())
      wsService.send('join', { roomId: roomId.trim() })
    }
  }

  const handleMove = (x: number, y: number) => {
    if (gameState && gameState.status === 'playing') {
      wsService.send('move', { x, y })
    }
  }

  if (joinedRoom) {
    return (
      <div className="flex flex-col w-screen h-screen bg-background text-foreground dark">
        {/* Top UI Bar */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-background/80 backdrop-blur-sm z-10 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Dots Game</h1>
            <span className="px-3 py-1 bg-secondary rounded-full text-sm font-mono">
              Room: {joinedRoom}
            </span>
          </div>
          
          {gameState && (
            <div className="flex gap-4 items-center">
              <div className="text-sm">
                Status: {gameState.status === 'playing' ? (
                  <span className={cn(
                    "font-bold",
                    gameState.currentTurn === 1 ? "text-blue-500" : "text-red-500"
                  )}>
                    Player {gameState.currentTurn}'s Turn
                  </span>
                ) : (
                  "Waiting for Player 2..."
                )}
              </div>
              <button 
                onClick={() => {
                  setJoinedRoom(null);
                  setGameState(null);
                  // Quick hack to leave room is just reconnecting or server handles it
                  window.location.reload(); 
                }}
                className="px-3 py-1 bg-destructive text-destructive-foreground rounded-md text-sm"
              >
                Leave
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md z-20 shadow-lg">
            {error}
          </div>
        )}

        {/* Game Canvas */}
        <div className="flex-1 w-full h-full">
          <GameBoard state={gameState} onMove={handleMove} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground dark">
      <h1 className="text-5xl font-bold mb-12 tracking-tight">
        <span className="text-blue-500">D</span>
        <span className="text-red-500">o</span>
        ts Game
      </h1>
      
      <div className="flex flex-col gap-6 max-w-sm w-full p-8 bg-card rounded-xl shadow-lg border">
        <button 
          onClick={handleCreateRoom}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
        >
          Create New Room
        </button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or join existing</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Room ID" 
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg bg-background"
          />
          <button 
            onClick={handleJoinRoom}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium transition-colors"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
