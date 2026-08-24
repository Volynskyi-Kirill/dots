import { useState, useEffect, useCallback } from 'react'
import { wsService } from './services/websocket'
import { GameBoard, GameState } from './components/GameBoard'
import { cn } from './lib/utils'
import { Copy, Check, Share2, LogOut } from 'lucide-react'

function App() {
  const [roomId, setRoomId] = useState('')
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const joinRoomById = useCallback((id: string) => {
    const cleanId = id.trim()
    if (!cleanId) return
    setJoinedRoom(cleanId)
    // Update URL query param without full reload
    const url = new URL(window.location.href)
    url.searchParams.set('room', cleanId)
    window.history.pushState({}, '', url.toString())
    wsService.send('join', { roomId: cleanId })
  }, [])

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

    // Check if room is present in URL
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    if (roomParam) {
      setTimeout(() => {
        joinRoomById(roomParam)
      }, 300)
    }

    return () => {
      wsService.off('state', onState)
      wsService.off('error', onError)
    }
  }, [joinRoomById])

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8)
    joinRoomById(newRoomId)
  }

  const handleJoinRoom = () => {
    joinRoomById(roomId)
  }

  const handleCopyLink = async () => {
    if (!joinedRoom) return
    const inviteUrl = `${window.location.origin}?room=${joinedRoom}`
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl)
      } else {
        // Fallback
        const textarea = document.createElement('textarea')
        textarea.value = inviteUrl
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleShare = async () => {
    if (!joinedRoom) return
    const inviteUrl = `${window.location.origin}?room=${joinedRoom}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dots Game Invitation',
          text: `Join my Dots game in room: ${joinedRoom}`,
          url: inviteUrl,
        })
      } catch (err) {
        // Share cancelled or failed, fallback to copy
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleLeaveRoom = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    window.history.pushState({}, '', url.toString())
    setJoinedRoom(null)
    setGameState(null)
    window.location.reload()
  }

  const handleMove = (x: number, y: number) => {
    if (gameState && gameState.status === 'playing') {
      wsService.send('move', { x, y })
    }
  }

  let p1Score = 0;
  let p2Score = 0;
  if (gameState) {
    p1Score = (gameState.capturedP1 || []).filter(p => gameState.board[p.y] && gameState.board[p.y][p.x] === 2).length;
    p2Score = (gameState.capturedP2 || []).filter(p => gameState.board[p.y] && gameState.board[p.y][p.x] === 1).length;
  }

  if (joinedRoom) {
    return (
      <div className="flex flex-col w-screen h-screen bg-background text-foreground dark overflow-hidden">
        {/* Top UI Bar */}
        <div className="w-full px-4 py-3 flex flex-wrap gap-2 justify-between items-center bg-background z-10 border-b shadow-sm flex-none">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              Dots
            </h1>
            <div className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-md border text-xs font-mono">
              <span>Room: <strong>{joinedRoom}</strong></span>
              <button
                onClick={handleCopyLink}
                title="Copy Invite Link"
                className="ml-1 p-1 hover:bg-background/80 rounded transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[10px] text-green-500 font-sans font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-sans">Copy Link</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleShare}
                title="Share Link"
                className="p-1 hover:bg-background/80 rounded transition-colors text-muted-foreground hover:text-foreground"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {gameState && (
              <div className="text-xs sm:text-sm font-medium">
                {gameState.status === 'playing' ? (
                  <span className={cn(
                    "px-2.5 py-1 rounded-full border shadow-sm",
                    gameState.currentTurn === 1 
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/30" 
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  )}>
                    Player {gameState.currentTurn}'s Turn
                  </span>
                ) : (
                  <span className="text-muted-foreground animate-pulse">
                    Waiting for opponent...
                  </span>
                )}
              </div>
            )}
            <button 
              onClick={handleLeaveRoom}
              className="flex items-center gap-1 px-3 py-1 bg-destructive/90 hover:bg-destructive text-destructive-foreground rounded-md text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium px-4 py-2 rounded-lg z-20 shadow-lg border border-destructive/50 animate-bounce">
            {error}
          </div>
        )}

        {/* Game Canvas */}
        <div className="flex-1 w-full min-h-0 relative">
          
          {/* Floating Scoreboard */}
          {gameState && gameState.status === 'playing' && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-6 px-6 py-2 bg-background/85 backdrop-blur-md rounded-full border shadow-lg z-10 pointer-events-none">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Player 1</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                  <span className="font-mono font-bold text-xl leading-none">{p1Score}</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-border"></div>
              
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Player 2</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xl leading-none">{p2Score}</span>
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                </div>
              </div>
            </div>
          )}

          <GameBoard state={gameState} onMove={handleMove} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground dark">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          <span className="text-blue-500">D</span>
          <span className="text-red-500">o</span>
          ts Game
        </h1>
        <p className="text-sm text-muted-foreground">Classic multiplayer strategy game</p>
      </div>
      
      <div className="flex flex-col gap-5 max-w-sm w-full p-6 sm:p-8 bg-card rounded-2xl shadow-xl border">
        <button 
          onClick={handleCreateRoom}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 font-medium transition-all shadow-md active:scale-[0.98]"
        >
          Create New Room
        </button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground font-semibold">Or join room</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter Room ID" 
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            className="flex-1 px-3 py-2 text-sm border rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button 
            onClick={handleJoinRoom}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 font-medium text-sm transition-all"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
