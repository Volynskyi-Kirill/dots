import { useState, useEffect, useCallback } from 'react'
import { wsService } from './services/websocket'
import { GameBoard, GameState } from './components/GameBoard'
import { cn } from './lib/utils'
import { Copy, Check, Share2, LogOut, Menu, RotateCcw, Flag, Swords, Settings, X } from 'lucide-react'
import { Timer } from './components/Timer'
function App() {
  const [roomId, setRoomId] = useState('')
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null)
  
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [controlScheme, setControlScheme] = useState<'direct' | 'drag' | 'confirm'>(() => {
    return (localStorage.getItem('dots_control_scheme') as 'direct' | 'drag' | 'confirm') || 'direct'
  })

  useEffect(() => {
    localStorage.setItem('dots_control_scheme', controlScheme)
  }, [controlScheme])

  const [timerEnabled, setTimerEnabled] = useState(false)
  const [initialTimeMins, setInitialTimeMins] = useState(5)
  const [incrementSecs, setIncrementSecs] = useState(3)

  const joinRoomById = useCallback((id: string, settings?: any) => {
    const cleanId = id.trim()
    if (!cleanId) return
    setJoinedRoom(cleanId)
    // Update URL query param without full reload
    const url = new URL(window.location.href)
    url.searchParams.set('room', cleanId)
    window.history.pushState({}, '', url.toString())
    wsService.send('join', { roomId: cleanId, settings })
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

    const onWelcome = (data: { playerId: number }) => {
      setMyPlayerId(data.playerId)
    }

    wsService.on('state', onState)
    wsService.on('error', onError)
    wsService.on('welcome', onWelcome)

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
      wsService.off('welcome', onWelcome)
    }
  }, [joinRoomById])

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8)
    joinRoomById(newRoomId, {
      timerEnabled,
      initialTime: initialTimeMins * 60 * 1000,
      increment: incrementSecs * 1000
    })
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
        <div className="w-full px-4 py-3 flex justify-between items-center bg-background z-10 border-b shadow-sm flex-none">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              Dots
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1 rounded-md border text-xs font-mono">
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
          
          <div className="flex items-center gap-3 sm:gap-4">
            {gameState && (
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                {/* Match Score */}
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-secondary/20 rounded-md border text-xs">
                  <Swords className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono font-bold text-blue-500">{gameState.matchScoreP1 || 0}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-mono font-bold text-red-500">{gameState.matchScoreP2 || 0}</span>
                </div>

                {gameState.status === 'playing' && (
                  <div className="flex items-center gap-3 bg-secondary/30 px-3 py-1 rounded-full border shadow-inner">
                    {gameState.settings?.timerEnabled && <Timer gameState={gameState} player={1} />}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                      <span className="font-mono font-bold text-sm">{p1Score}</span>
                    </div>
                    <div className="w-px h-4 bg-border"></div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm">{p2Score}</span>
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                    </div>
                    {gameState.settings?.timerEnabled && <Timer gameState={gameState} player={2} />}
                  </div>
                )}
              </div>
            )}

            {/* Action UI (Visible on both mobile and desktop) */}
            {gameState && myPlayerId && (
              <div className="flex items-center gap-1">
                {gameState.status === 'playing' ? (
                  <>
                    <div className="flex items-center justify-center min-w-[70px] sm:min-w-[90px]">
                      {(!gameState.undoRequestedBy || gameState.undoRequestedBy === 0) ? (
                        <button 
                          disabled={!(gameState.currentTurn !== myPlayerId && gameState.lastMove)}
                          onClick={() => wsService.send('request_undo', {})}
                          className="disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 px-2.5 py-1 bg-secondary/80 hover:bg-secondary rounded-md text-[10px] sm:text-xs font-medium border shadow-sm transition-colors text-muted-foreground hover:text-foreground w-full justify-center"
                          title="Undo Move"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Undo</span>
                        </button>
                      ) : gameState.undoRequestedBy === myPlayerId ? (
                        <span className="text-[10px] sm:text-xs text-muted-foreground animate-pulse border px-2 py-1 rounded-md bg-secondary/30 w-full text-center">
                          Wait<span className="hidden sm:inline">ing...</span>
                        </span>
                      ) : !!gameState.undoRequestedBy && gameState.undoRequestedBy !== myPlayerId ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                          <span className="text-[10px] sm:text-xs font-bold text-destructive mr-0.5">Undo?</span>
                          <button 
                            onClick={() => wsService.send('answer_undo', { accept: true })}
                            className="px-2 py-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded-md text-[10px] sm:text-xs font-bold transition-colors border border-green-500/30"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={() => wsService.send('answer_undo', { accept: false })}
                            className="px-2 py-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-md text-[10px] sm:text-xs font-bold transition-colors border border-red-500/30"
                          >
                            No
                          </button>
                        </div>
                      ) : null}
                    </div>
                    
                    <button 
                      onClick={() => { if(confirm('Are you sure you want to surrender?')) wsService.send('surrender', {}) }}
                      className="flex items-center justify-center px-2.5 py-1 bg-secondary/80 hover:bg-destructive/20 hover:text-destructive rounded-md text-[10px] sm:text-xs font-medium border shadow-sm transition-colors text-muted-foreground"
                      title="Surrender"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : gameState.status === 'finished' ? (
                  <div className="flex items-center gap-2">
                    {!gameState.rematchRequestedBy && (
                       <button onClick={() => wsService.send('request_rematch', {})} className="px-2.5 py-1 bg-primary text-primary-foreground rounded-md text-[10px] sm:text-xs font-medium border shadow-sm hover:bg-primary/80 transition-colors">Rematch</button>
                    )}
                    {gameState.rematchRequestedBy === myPlayerId && (
                       <span className="text-[10px] sm:text-xs text-muted-foreground animate-pulse border px-2 py-1 rounded-md bg-secondary/30">Waiting...</span>
                    )}
                    {!!gameState.rematchRequestedBy && gameState.rematchRequestedBy !== myPlayerId && (
                       <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                         <span className="text-[10px] sm:text-xs font-bold text-primary mr-0.5">Rematch?</span>
                         <button onClick={() => wsService.send('answer_rematch', { accept: true })} className="px-2 py-1 bg-green-500/20 text-green-500 border border-green-500/30 hover:bg-green-500/30 rounded-md text-[10px] sm:text-xs font-bold">Yes</button>
                         <button onClick={() => wsService.send('answer_rematch', { accept: false })} className="px-2 py-1 bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30 rounded-md text-[10px] sm:text-xs font-bold">No</button>
                       </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Desktop-only: Turn & Leave */}
            <div className="hidden sm:flex items-center gap-4">
              <button onClick={() => setSettingsOpen(true)} className="p-2 mr-2 text-muted-foreground hover:text-foreground hidden sm:block">
                <Settings className="w-5 h-5" />
              </button>
              {gameState && (
                <div className="text-sm font-medium flex items-center gap-2">
                  {gameState.status === 'playing' ? (
                    <span className={cn(
                      "px-2.5 py-1 rounded-full border shadow-sm inline-block",
                      gameState.currentTurn === 1 
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30" 
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    )}>
                      Player {gameState.currentTurn}'s Turn
                    </span>
                  ) : gameState.status === 'finished' ? (
                    <span className="text-muted-foreground font-bold">Game Over</span>
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

            {/* Mobile-only: Burger Menu */}
            <div className="sm:hidden relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 -mr-2 text-foreground">
                <Menu className="w-5 h-5" />
              </button>
              
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card border rounded-lg shadow-xl z-50 flex flex-col py-1 animate-in fade-in zoom-in duration-150">
                    <div className="px-4 py-2 border-b">
                      <div className="text-xs text-muted-foreground">Room ID</div>
                      <div className="font-mono font-bold">{joinedRoom}</div>
                    </div>
                    
                    {gameState && (
                      <div className="px-4 py-2 border-b">
                        <div className="text-xs text-muted-foreground mb-1">Status</div>
                        {gameState.status === 'playing' ? (
                          <span className={cn(
                            "text-xs font-bold",
                            gameState.currentTurn === 1 ? "text-blue-500" : "text-red-500"
                          )}>
                            Player {gameState.currentTurn}'s Turn
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground animate-pulse">Waiting...</span>
                        )}
                      </div>
                    )}
                    
                    {gameState && (
                      <div className="px-4 py-2 border-b">
                        <div className="text-xs text-muted-foreground mb-1">Series Score</div>
                        <div className="text-sm font-mono font-bold flex gap-3">
                          <span className="text-blue-500">P1: {gameState.matchScoreP1 || 0}</span>
                          <span className="text-red-500">P2: {gameState.matchScoreP2 || 0}</span>
                        </div>
                      </div>
                    )}

                    <button onClick={() => { handleCopyLink(); setMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted text-left mt-1">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />} 
                      {copied ? <span className="text-green-500">Copied!</span> : <span>Copy Link</span>}
                    </button>
                    <button onClick={() => { handleShare(); setMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted text-left">
                      <Share2 className="w-4 h-4" /> Share Link
                    </button>
                    <button onClick={() => { setSettingsOpen(true); setMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted text-left mt-1 border-t pt-2">
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button onClick={handleLeaveRoom} className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 text-left mt-1 border-t pt-2">
                      <LogOut className="w-4 h-4" /> Leave Game
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground text-xs sm:text-sm font-medium px-4 py-2 rounded-lg z-20 shadow-lg border border-destructive/50 animate-bounce">
            {error}
          </div>
        )}
        
        {settingsOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-card border shadow-xl rounded-xl w-full max-w-sm p-6 relative">
              <button onClick={() => setSettingsOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Settings</h2>
              
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Controls (Mobile / Touch)</h3>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50">
                    <input type="radio" name="controls" value="direct" checked={controlScheme === 'direct'} onChange={() => setControlScheme('direct')} className="mt-1" />
                    <div>
                      <div className="font-medium text-sm text-foreground">Classic (Direct Tap)</div>
                      <div className="text-xs text-muted-foreground">Tap anywhere to instantly place a dot. One finger to pan.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50">
                    <input type="radio" name="controls" value="drag" checked={controlScheme === 'drag'} onChange={() => setControlScheme('drag')} className="mt-1" />
                    <div>
                      <div className="font-medium text-sm text-foreground">Smart Aim (Drag & Release)</div>
                      <div className="text-xs text-muted-foreground">Drag to aim perfectly, release to place. Use two fingers to pan.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50">
                    <input type="radio" name="controls" value="confirm" checked={controlScheme === 'confirm'} onChange={() => setControlScheme('confirm')} className="mt-1" />
                    <div>
                      <div className="font-medium text-sm text-foreground">Double Tap (Confirm)</div>
                      <div className="text-xs text-muted-foreground">Tap to select a spot, tap again to confirm. One finger to pan.</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <button onClick={() => setSettingsOpen(false)} className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Game Canvas */}
        <div className="flex-1 w-full min-h-0 relative">
          <GameBoard state={gameState} onMove={handleMove} controlScheme={controlScheme} />
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
        
        <div className="flex flex-col gap-3 p-4 bg-secondary/20 rounded-xl border">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input 
              type="checkbox" 
              checked={timerEnabled} 
              onChange={e => setTimerEnabled(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Enable Timer
          </label>
          
          {timerEnabled && (
            <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground w-1/2">
                Time (minutes)
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={initialTimeMins} 
                  onChange={e => setInitialTimeMins(parseInt(e.target.value) || 1)}
                  className="px-2 py-1.5 rounded border bg-background text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground w-1/2">
                Increment (seconds)
                <input 
                  type="number" 
                  min="0" 
                  max="60"
                  value={incrementSecs} 
                  onChange={e => setIncrementSecs(parseInt(e.target.value) || 0)}
                  className="px-2 py-1.5 rounded border bg-background text-foreground"
                />
              </label>
            </div>
          )}
        </div>

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
