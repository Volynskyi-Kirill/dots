import { useState, useRef, useCallback } from 'react';
import { Point, GameState } from '@/lib/types';
import { ControlSchemeType, CONTROL_SCHEME } from '@/lib/constants';

export const useBoardInteraction = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  state: GameState | null,
  myPlayerId: number | null | undefined,
  width: number,
  height: number,
  scale: number,
  offset: { x: number; y: number },
  setCamera: React.Dispatch<React.SetStateAction<{ scale: number; offset: { x: number; y: number } }>>,
  clampOffset: (x: number, y: number, currentScale: number) => { x: number; y: number },
  controlScheme: ControlSchemeType,
  onMove: (x: number, y: number) => void
) => {
  const activeTouches = useRef<Map<number, Point>>(new Map());
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<Point | null>(null);
  const hasDragged = useRef(false);
  const [ghostDot, setGhostDot] = useState<Point | null>(null);

  const updateGhostDot = useCallback((clientX: number, clientY: number) => {
    if (state?.currentTurn !== myPlayerId) {
      setGhostDot(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
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
  }, [state?.currentTurn, myPlayerId, canvasRef, offset.x, offset.y, scale, width, height]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    hasDragged.current = false;
    canvasRef.current?.setPointerCapture(e.pointerId);

    if (controlScheme === CONTROL_SCHEME.DRAG && activeTouches.current.size === 1) {
      updateGhostDot(e.clientX, e.clientY - 40);
    }
  }, [canvasRef, controlScheme, updateGhostDot]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (controlScheme === CONTROL_SCHEME.DRAG) {
        updateGhostDot(e.clientX, e.clientY);
      }
      return;
    }
    if (!activeTouches.current.has(e.pointerId)) return;

    const prevPos = activeTouches.current.get(e.pointerId)!;
    const dx = e.clientX - prevPos.x;
    const dy = e.clientY - prevPos.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.current = true;
    }
    
    activeTouches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (controlScheme === CONTROL_SCHEME.DRAG) {
      if (activeTouches.current.size === 1) {
        updateGhostDot(e.clientX, e.clientY - 40);
        return;
      } else if (activeTouches.current.size === 2) {
        setGhostDot(null);
      }
    }

    if (activeTouches.current.size === 1) {
      setCamera(prev => ({
        scale: prev.scale,
        offset: clampOffset(prev.offset.x + dx, prev.offset.y + dy, prev.scale)
      }));
    } else if (activeTouches.current.size === 2) {
      const pts = Array.from(activeTouches.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const centerX = (pts[0].x + pts[1].x) / 2;
      const centerY = (pts[0].y + pts[1].y) / 2;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
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
  }, [canvasRef, controlScheme, updateGhostDot, setCamera, clampOffset]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;

    if (controlScheme === CONTROL_SCHEME.DRAG && activeTouches.current.size === 1 && hasDragged.current) {
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
    if (controlScheme === CONTROL_SCHEME.DRAG && activeTouches.current.size === 0) {
      setGhostDot(null);
    }
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }, [canvasRef, controlScheme, state?.currentTurn, myPlayerId, onMove]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const gridX = Math.round((mouseX - offset.x) / scale);
    const gridY = Math.round((mouseY - offset.y) / scale);

    if (state?.currentTurn !== myPlayerId) return;

    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
      if (controlScheme === CONTROL_SCHEME.CONFIRM) {
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
  }, [canvasRef, offset.x, offset.y, scale, state?.currentTurn, myPlayerId, width, height, controlScheme, onMove]);

  return {
    ghostDot,
    setGhostDot,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClick
  };
};
