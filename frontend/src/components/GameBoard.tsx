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
  
  // Camera state
  const [scale, setScale] = useState(20); // base grid cell size in pixels
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background color based on theme can be inherited, but we make canvas transparent
    // and draw the grid.
    
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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

    if (state) {
      // Draw captured areas
      const drawPolygons = (polygons: Point[][], fillColor: string, strokeColor: string) => {
        polygons.forEach(poly => {
          if (poly.length < 3) return;
          ctx.beginPath();
          ctx.moveTo(poly[0].x, poly[0].y);
          for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i].x, poly[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2 / scale;
          ctx.stroke();
        });
      };

      // Neon colors
      drawPolygons(state.polygonsP1 || [], 'rgba(59, 130, 246, 0.2)', '#3b82f6'); // Blue
      drawPolygons(state.polygonsP2 || [], 'rgba(239, 68, 68, 0.2)', '#ef4444');  // Red

      // Draw dots
      const drawDots = (player: number, color: string) => {
        ctx.fillStyle = color;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (state.board[y][x] === player) {
              ctx.beginPath();
              ctx.arc(x, y, 0.3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      };

      drawDots(1, '#3b82f6');
      drawDots(2, '#ef4444');
    }

    ctx.restore();
  }, [state, offset, scale, width, height]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        draw();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Event Handlers for Panning & Zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.005;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale * Math.exp(delta);
    
    // Limits
    if (newScale < 5) newScale = 5;
    if (newScale > 100) newScale = 100;

    // Zoom towards mouse pointer
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
    // If it was a drag, don't trigger click
    if (isDragging && (Math.abs(e.clientX - dragStart.x - offset.x) > 5)) return;

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
    <div className="w-full h-full overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        className="w-full h-full touch-none cursor-crosshair"
      />
    </div>
  );
};
