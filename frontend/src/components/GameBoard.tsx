import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  board: number[][];
  currentTurn: number;
  capturedP1: Point[];
  capturedP2: Point[];
  polygonsP1: Point[][];
  polygonsP2: Point[][];
  status: string;
}

interface GameBoardProps {
  state: GameState | null;
  onMove: (x: number, y: number) => void;
  width?: number;
  height?: number;
}

export const GameBoard: React.FC<GameBoardProps> = ({ state, onMove, width = 39, height = 39 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Camera state
  const [scale, setScale] = useState(24);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initializedCenter, setInitializedCenter] = useState(false);

  // Helper to center the board on screen
  const centerBoard = useCallback((currentScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const boardWidthPx = (width - 1) * currentScale;
    const boardHeightPx = (height - 1) * currentScale;
    const centerX = (canvas.width - boardWidthPx) / 2;
    const centerY = (canvas.height - boardHeightPx) / 2;
    setOffset({ x: centerX, y: centerY });
  }, [width, height]);

  // Handle Resize & Initial Centering
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        if (!initializedCenter) {
          // Adjust initial scale to fit reasonably on screen
          const fitScale = Math.min(
            Math.max(12, Math.floor(Math.min(container.clientWidth, container.clientHeight) / (width + 2))),
            28
          );
          setScale(fitScale);
          centerBoard(fitScale);
          setInitializedCenter(true);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [centerBoard, initializedCenter, width]);

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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
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

          // Also connect any adjacent boundary dots directly (handles complex shapes & diagonals cleanly)
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
              ctx.save();
              ctx.fillStyle = color;
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(x, y, 0.32, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
        }
      };

      drawDots(1, '#60a5fa', 'rgba(96, 165, 250, 0.6)');
      drawDots(2, '#f87171', 'rgba(248, 113, 113, 0.6)');
    }

    ctx.restore();
  }, [state, offset, scale, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Event Handlers for Panning & Zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.003;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale * Math.exp(delta);
    
    // Limits
    if (newScale < 8) newScale = 8;
    if (newScale > 80) newScale = 80;

    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newOffset = {
      x: mouseX - (mouseX - offset.x) * (newScale / scale),
      y: mouseY - (mouseY - offset.y) * (newScale / scale),
    };

    setScale(newScale);
    setOffset(newOffset);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging && (Math.abs(e.clientX - (dragStart.x + offset.x)) > 5 || Math.abs(e.clientY - (dragStart.y + offset.y)) > 5)) {
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.round((mouseX - offset.x) / scale);
    const gridY = Math.round((mouseY - offset.y) / scale);

    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
      onMove(gridX, gridY);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        className="w-full h-full touch-none cursor-crosshair"
      />
      
      {/* Floating Center / Reset Zoom Control */}
      <button
        onClick={() => centerBoard(scale)}
        className="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium bg-secondary/80 hover:bg-secondary text-secondary-foreground backdrop-blur-md rounded-md shadow-md border transition-all"
      >
        Center Board
      </button>
    </div>
  );
};
