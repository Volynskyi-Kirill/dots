"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Point, RoomSettings } from '@/lib/types';
import { useTheme } from 'next-themes';

interface GameBoardProps {
  state: GameState | null;
  onMove: (x: number, y: number) => void;
  width?: number;
  height?: number;
  controlScheme?: 'direct' | 'drag' | 'confirm';
  myPlayerId?: number | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({ state, onMove, width = 39, height = 39, controlScheme = "direct", myPlayerId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { resolvedTheme } = useTheme();

  // Camera state
  const [{ scale, offset }, setCamera] = useState({ scale: 24, offset: { x: 0, y: 0 } });
  const [initializedCenter, setInitializedCenter] = useState(false);

  // Touch tracking
  const activeTouches = useRef<Map<number, Point>>(new Map());
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<Point | null>(null);
  const hasDragged = useRef(false);
  const [ghostDot, setGhostDot] = useState<Point | null>(null);

  // Helper to center the board on screen
  const centerBoard = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const isDesktop = window.innerWidth > 768;
    const padding = isDesktop ? 80 : 20; // Extra padding on desktop
    
    const fitScale = Math.max(5, Math.min(
      (cw - padding) / (width - 1),
      (ch - padding) / (height - 1)
    ));
    
    setCamera({
      scale: fitScale,
      offset: {
        x: (cw - (width - 1) * fitScale) / 2,
        y: (ch - (height - 1) * fitScale) / 2
      }
    });
  }, [width, height]);

  // Handle Resize & Initial Centering
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Auto-center on desktop always, on mobile only initially
        if (window.innerWidth > 768 || !initializedCenter) {
          centerBoard();
          if (!initializedCenter) setInitializedCenter(true);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial setup
    return () => window.removeEventListener('resize', handleResize);
  }, [centerBoard, initializedCenter]);

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw Grid background bounding box / subtle grid
    ctx.strokeStyle = resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      ctx.moveTo(0, y);
      ctx.lineTo(width - 1, y);
    }
    ctx.stroke();

    // Draw Board boundary frame
    ctx.strokeStyle = resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, width - 1, height - 1);

    if (state) {
      // 1. Draw captured territory polygons with smooth diagonal lines & glow
      const drawPolygons = (polygons: Point[][], fillColor: string, strokeColor: string) => {
        polygons.forEach(poly => {
          if (!poly || poly.length < 3) return;
          
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(poly[0].x, poly[0].y);
          for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i].x, poly[i].y);
          }
          ctx.closePath();

          // Soft translucent fill
          ctx.fillStyle = fillColor;
          ctx.fill();

          // Smooth glowing stroke
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2.5 / scale;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.stroke();

          // Also connect any adjacent boundary dots directly
          ctx.beginPath();
          for (let i = 0; i < poly.length; i++) {
            for (let j = i + 1; j < poly.length; j++) {
              const dx = Math.abs(poly[i].x - poly[j].x);
              const dy = Math.abs(poly[i].y - poly[j].y);
              if (dx <= 1 && dy <= 1 && (dx + dy > 0)) {
                ctx.moveTo(poly[i].x, poly[i].y);
                ctx.lineTo(poly[j].x, poly[j].y);
              }
            }
          }
          ctx.stroke();
          ctx.restore();
        });
      };

      // Neon colors
      drawPolygons(state.polygonsP1 || [], 'rgba(59, 130, 246, 0.25)', '#3b82f6'); // Blue
      drawPolygons(state.polygonsP2 || [], 'rgba(239, 68, 68, 0.25)', '#ef4444');  // Red

      // 2. Draw captured dots styling (dimmed/surrounded)
      const drawCapturedPoints = (points: Point[], color: string) => {
        ctx.fillStyle = color;
        points?.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.18, 0, Math.PI * 2);
          ctx.fill();
        });
      };
      drawCapturedPoints(state.capturedP1 || [], 'rgba(59, 130, 246, 0.4)');
      drawCapturedPoints(state.capturedP2 || [], 'rgba(239, 68, 68, 0.4)');

      // 3. Draw active dots
      const drawDots = (player: number, color: string, glowColor: string) => {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (state.board[y][x] === player) {
              const isLastMove = state.lastMove?.x === x && state.lastMove?.y === y;
              
              ctx.save();
              ctx.fillStyle = color;
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = isLastMove ? 12 : 8;
              
              ctx.beginPath();
              ctx.arc(x, y, isLastMove ? 0.34 : 0.32, 0, Math.PI * 2);
              ctx.fill();
              
              if (isLastMove) {
                // White inner core outline
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 0.08;
                ctx.stroke();
              }
              
              ctx.restore();
            }
          }
        }
      };

      drawDots(1, '#60a5fa', 'rgba(96, 165, 250, 0.6)');
      drawDots(2, '#f87171', 'rgba(248, 113, 113, 0.6)');
    }

    // Draw Ghost Dot (before restoring context so it uses grid scaling)
    if (ghostDot && (controlScheme === 'drag' || controlScheme === 'confirm') && state?.currentTurn === myPlayerId) {
      ctx.save();
      ctx.fillStyle = controlScheme === 'drag' ? (resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.7)') : 'rgba(234, 179, 8, 0.8)';
      ctx.shadowColor = resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ghostDot.x, ghostDot.y, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Draw Grid Coordinates (1 to N on the left and bottom) using absolute screen coordinates
    // This prevents browser minimum font size issues that occur when scaling the canvas context
    ctx.save();
    ctx.fillStyle = resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)';
    const fontSize = Math.max(8, scale * 0.45); 
    ctx.font = `${fontSize}px monospace`;
    
    // Dynamic step based on scale to prevent label overlapping
    let step = 1;
    if (scale < 8) step = 10;
    else if (scale < 12) step = 5;
    else if (scale < 16) step = 2;

    const xOffset = Math.max(8, scale * 0.4);
    const yOffset = Math.max(8, scale * 0.4);

    // Left edge (y coordinates, starting from 1 at the bottom)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < height; y++) {
      const label = height - y;
      if (label % step !== 0 && label !== 1) continue;
      
      const screenY = offset.y + y * scale;
      if (screenY >= -20 && screenY <= canvas.height + 20) {
        ctx.fillText(label.toString(), offset.x - xOffset, screenY);
      }
    }

    // Bottom edge (x coordinates, starting from 1 at the left)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = 0; x < width; x++) {
      const label = x + 1;
      if (label % step !== 0 && label !== 1) continue;

      const screenX = offset.x + x * scale;
      if (screenX >= -20 && screenX <= canvas.width + 20) {
        ctx.fillText(label.toString(), screenX, offset.y + (height - 1) * scale + yOffset);
      }
    }
    ctx.restore();
  }, [state, offset, scale, width, height, ghostDot, controlScheme, resolvedTheme, myPlayerId]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Touch Event Handlers for Mobile Pan & Zoom (Mouse is ignored for movement)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return; // Disable mouse dragging
    activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    hasDragged.current = false;
    canvasRef.current?.setPointerCapture(e.pointerId);

    if (controlScheme === 'drag' && activeTouches.current.size === 1) {
      updateGhostDot(e.clientX, e.clientY - 40);
    }
  };

  const updateGhostDot = (clientX: number, clientY: number) => {
    if (state?.currentTurn !== myPlayerId) {
      setGhostDot(null);
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    
    // Calculate based on the latest state values (closure)
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const gridX = Math.round((mouseX - offset.x) / scale);
    const gridY = Math.round((mouseY - offset.y) / scale);

    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
      setGhostDot(prev => {
        if (prev?.x === gridX && prev?.y === gridY) return prev;
        return { x: gridX, y: gridY };
      });
    } else {
      setGhostDot(null);
    }
  };

  const clampOffset = (x: number, y: number, currentScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x, y };
    
    const cw = canvas.width;
    const ch = canvas.height;
    const bw = (width - 1) * currentScale;
    const bh = (height - 1) * currentScale;

    let newX = x;
    let newY = y;
    
    // Allow panning until the edge of the board reaches the center of the screen
    const marginX = cw / 2;
    const marginY = ch / 2;

    if (bw <= cw) {
      newX = (cw - bw) / 2;
    } else {
      newX = Math.min(newX, marginX);
      newX = Math.max(newX, cw - bw - marginX);
    }

    if (bh <= ch) {
      newY = (ch - bh) / 2;
    } else {
      newY = Math.min(newY, marginY);
      newY = Math.max(newY, ch - bh - marginY);
    }

    return { x: newX, y: newY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (controlScheme === 'drag') {
        updateGhostDot(e.clientX, e.clientY); // No offset for mouse
      }
      return; // Disable mouse dragging
    }
    if (!activeTouches.current.has(e.pointerId)) return;

    const prevPos = activeTouches.current.get(e.pointerId)!;
    const dx = e.clientX - prevPos.x;
    const dy = e.clientY - prevPos.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.current = true;
    }
    
    activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (controlScheme === 'drag') {
      if (activeTouches.current.size === 1) {
        updateGhostDot(e.clientX, e.clientY - 40);
        return; // Do NOT pan with 1 finger in drag mode
      } else if (activeTouches.current.size === 2) {
        setGhostDot(null); // Cancel ghost dot if zooming/panning with 2 fingers
      }
    }

    if (activeTouches.current.size === 1) {
      // Panning
      setCamera(prev => ({
        scale: prev.scale,
        offset: clampOffset(prev.offset.x + dx, prev.offset.y + dy, prev.scale)
      }));
    } else if (activeTouches.current.size === 2) {
      // Pinch to Zoom
      const pts = Array.from(activeTouches.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const centerX = (pts[0].x + pts[1].x) / 2;
      const centerY = (pts[0].y + pts[1].y) / 2;

      const rect = canvasRef.current!.getBoundingClientRect();
      const canvasCenterX = centerX - rect.left;
      const canvasCenterY = centerY - rect.top;

      if (lastTouchDist.current !== null && lastTouchCenter.current !== null) {
        const deltaScale = dist / lastTouchDist.current;
        const lastCanvasCenterX = lastTouchCenter.current.x - rect.left;
        const lastCanvasCenterY = lastTouchCenter.current.y - rect.top;
        
        const panX = canvasCenterX - lastCanvasCenterX;
        const panY = canvasCenterY - lastCanvasCenterY;
        
        setCamera(prev => {
          const newScale = Math.max(5, Math.min(prev.scale * deltaScale, 80));
          
          let newX = prev.offset.x + panX;
          let newY = prev.offset.y + panY;
          newX = canvasCenterX - (canvasCenterX - newX) * (newScale / prev.scale);
          newY = canvasCenterY - (canvasCenterY - newY) * (newScale / prev.scale);
          
          return {
            scale: newScale,
            offset: clampOffset(newX, newY, newScale)
          };
        });
      }
      lastTouchDist.current = dist;
      lastTouchCenter.current = { x: centerX, y: centerY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;

    if (controlScheme === 'drag' && activeTouches.current.size === 1 && hasDragged.current) {
       setGhostDot(currentGhost => {
           if (currentGhost && state?.currentTurn === myPlayerId) {
               onMove(currentGhost.x, currentGhost.y);
           }
           return null;
       });
    }
    activeTouches.current.delete(e.pointerId);
    if (activeTouches.current.size < 2) {
      lastTouchDist.current = null;
      lastTouchCenter.current = null;
    }
    if (controlScheme === 'drag' && activeTouches.current.size === 0) {
      setGhostDot(null);
    }
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent placing a dot if the user was just dragging on mobile
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.round((mouseX - offset.x) / scale);
    const gridY = Math.round((mouseY - offset.y) / scale);

    if (state?.currentTurn !== myPlayerId) return;

    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
      if (controlScheme === 'confirm') {
         setGhostDot(prev => {
             if (prev?.x === gridX && prev?.y === gridY) {
                 onMove(gridX, gridY);
                 return null;
             }
             return { x: gridX, y: gridY };
         });
      } else {
         onMove(gridX, gridY);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-background">
      {controlScheme === 'confirm' && ghostDot && state?.currentTurn === myPlayerId && (
        <button
          onClick={(e) => { e.stopPropagation(); onMove(ghostDot.x, ghostDot.y); setGhostDot(null); }}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full shadow-xl border border-primary/50 z-20 text-sm sm:text-base animate-in slide-in-from-bottom-5 duration-200"
        >
          ✓ Confirm Move
        </button>
      )}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setGhostDot(null)}
        onClick={handleClick}
        // onWheel is intentionally removed so desktop users can't zoom with mouse wheel
        className="w-full h-full touch-none cursor-crosshair"
      />
      
      {/* Mobile-only center button (hidden on desktop) */}
      <button
        onClick={centerBoard}
        className="md:hidden absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium bg-secondary/80 hover:bg-secondary text-secondary-foreground backdrop-blur-md rounded-md shadow-md border transition-all z-10"
      >
        Center Board
      </button>
    </div>
  );
};
