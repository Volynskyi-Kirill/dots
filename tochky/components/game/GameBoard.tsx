"use client";
import { CONTROL_SCHEME, ControlSchemeType } from '@/lib/constants';
import React, { useEffect, useRef, useCallback } from 'react';
import { GameState } from '@/lib/types';
import { useTheme } from 'next-themes';
import { useCamera } from '@/hooks/useCamera';
import { useBoardInteraction } from '@/hooks/useBoardInteraction';
import { drawGrid, drawPolygons, drawCapturedPoints, drawDots, drawGhostDot, drawGridCoordinates } from '@/lib/canvasUtils';

interface GameBoardProps {
  state: GameState | null;
  onMove: (x: number, y: number) => void;
  controlScheme?: ControlSchemeType;
  myPlayerId?: number | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({ state, onMove, controlScheme = CONTROL_SCHEME.DIRECT, myPlayerId }) => {
  const width = state?.settings?.boardWidth || 20;
  const height = state?.settings?.boardHeight || 20;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const { scale, offset, setCamera, initializedCenter, setInitializedCenter, centerBoard, clampOffset } = useCamera(width, height, canvasRef, containerRef);

  const {
    ghostDot,
    setGhostDot,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClick
  } = useBoardInteraction(
    canvasRef, state, myPlayerId, width, height, scale, offset, setCamera, clampOffset, controlScheme, onMove
  );

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        if (window.innerWidth > 768 || !initializedCenter) {
          centerBoard();
          if (!initializedCenter) setInitializedCenter(true);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [centerBoard, initializedCenter]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    drawGrid(ctx, width, height, scale, resolvedTheme);

    if (state) {
      drawPolygons(ctx, state.polygonsP1 || [], 'rgba(59, 130, 246, 0.25)', '#3b82f6', scale);
      drawPolygons(ctx, state.polygonsP2 || [], 'rgba(239, 68, 68, 0.25)', '#ef4444', scale);
      drawCapturedPoints(ctx, state.capturedP1 || [], 'rgba(59, 130, 246, 0.4)');
      drawCapturedPoints(ctx, state.capturedP2 || [], 'rgba(239, 68, 68, 0.4)');
      drawDots(ctx, state, 1, '#60a5fa', 'rgba(96, 165, 250, 0.6)', width, height);
      drawDots(ctx, state, 2, '#f87171', 'rgba(248, 113, 113, 0.6)', width, height);
    }

    drawGhostDot(ctx, ghostDot, controlScheme, state, myPlayerId, resolvedTheme);

    ctx.restore();

    drawGridCoordinates(ctx, width, height, scale, offset, canvas.width, canvas.height, resolvedTheme);
  }, [state, offset, scale, width, height, ghostDot, controlScheme, resolvedTheme, myPlayerId]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-background">
      {controlScheme === CONTROL_SCHEME.CONFIRM && ghostDot && state?.currentTurn === myPlayerId && (
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
        className="w-full h-full touch-none cursor-crosshair"
      />
      
      <button
        onClick={centerBoard}
        className="md:hidden absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium bg-secondary/80 hover:bg-secondary text-secondary-foreground backdrop-blur-md rounded-md shadow-md border transition-all z-10"
      >
        Center Board
      </button>
    </div>
  );
};
