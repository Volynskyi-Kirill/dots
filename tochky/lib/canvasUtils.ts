import { Point, GameState } from '@/lib/types';
import { ControlSchemeType, CONTROL_SCHEME } from '@/lib/constants';

export const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, scale: number, theme: string | undefined) => {
  ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)';
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
  ctx.strokeStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2 / scale;
  ctx.strokeRect(0, 0, width - 1, height - 1);
};

export const drawPolygons = (ctx: CanvasRenderingContext2D, polygons: Point[][], fillColor: string, strokeColor: string, scale: number) => {
  polygons.forEach(poly => {
    if (!poly || poly.length < 3) return;
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5 / scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

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

export const drawCapturedPoints = (ctx: CanvasRenderingContext2D, points: Point[], color: string) => {
  ctx.fillStyle = color;
  points?.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.18, 0, Math.PI * 2);
    ctx.fill();
  });
};

export const drawDots = (ctx: CanvasRenderingContext2D, state: GameState, player: number, color: string, glowColor: string, width: number, height: number) => {
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
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.08;
          ctx.stroke();
        }
        
        ctx.restore();
      }
    }
  }
};

export const drawGhostDot = (
  ctx: CanvasRenderingContext2D,
  ghostDot: Point | null,
  controlScheme: ControlSchemeType,
  state: GameState | null,
  myPlayerId: number | null | undefined,
  theme: string | undefined
) => {
  if (ghostDot && (controlScheme === CONTROL_SCHEME.DRAG || controlScheme === CONTROL_SCHEME.CONFIRM) && state?.currentTurn === myPlayerId) {
    ctx.save();
    ctx.fillStyle = controlScheme === CONTROL_SCHEME.DRAG ? (theme === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.7)') : 'rgba(234, 179, 8, 0.8)';
    ctx.shadowColor = theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ghostDot.x, ghostDot.y, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    ctx.restore();
  }
};

export const drawGridCoordinates = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  offset: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
  theme: string | undefined
) => {
  ctx.save();
  ctx.fillStyle = theme === 'light' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)';
  const fontSize = Math.max(8, scale * 0.45); 
  ctx.font = `${fontSize}px monospace`;
  
  let step = 1;
  if (scale < 8) step = 10;
  else if (scale < 12) step = 5;
  else if (scale < 16) step = 2;

  const xOffset = Math.max(8, scale * 0.4);
  const yOffset = Math.max(8, scale * 0.4);

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < height; y++) {
    const label = height - y;
    if (label % step !== 0 && label !== 1) continue;
    
    const screenY = offset.y + y * scale;
    if (screenY >= -20 && screenY <= canvasHeight + 20) {
      ctx.fillText(label.toString(), offset.x - xOffset, screenY);
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let x = 0; x < width; x++) {
    const label = x + 1;
    if (label % step !== 0 && label !== 1) continue;

    const screenX = offset.x + x * scale;
    if (screenX >= -20 && screenX <= canvasWidth + 20) {
      ctx.fillText(label.toString(), screenX, offset.y + (height - 1) * scale + yOffset);
    }
  }
  ctx.restore();
};
