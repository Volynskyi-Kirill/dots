import { useState, useCallback } from 'react';

export const useCamera = (width: number, height: number, canvasRef: React.RefObject<HTMLCanvasElement | null>, containerRef: React.RefObject<HTMLDivElement | null>) => {
  const [{ scale, offset }, setCamera] = useState({ scale: 24, offset: { x: 0, y: 0 } });
  const [initializedCenter, setInitializedCenter] = useState(false);

  const centerBoard = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const isDesktop = window.innerWidth > 768;
    const padding = isDesktop ? 80 : 20;
    
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
  }, [width, height, canvasRef, containerRef]);

  const clampOffset = useCallback((x: number, y: number, currentScale: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x, y };
    
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const bw = (width - 1) * currentScale;
    const bh = (height - 1) * currentScale;

    let newX = x;
    let newY = y;
    
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
  }, [width, height, canvasRef, containerRef]);

  return { scale, offset, setCamera, initializedCenter, setInitializedCenter, centerBoard, clampOffset };
};
