import type { FogAnimator } from './fogAnimator.js';

// Thème neutre fonctionnel (le thème « Carte du Maraudeur » arrive au Lot 6).
const FOG_COLOR = [20, 24, 38] as const;
const BACKGROUND_COLOR = '#2a2f3a';
const GRID_COLOR = 'rgba(255, 255, 255, 0.15)';

export interface BoardScene {
  cols: number;
  rows: number;
  fog: FogAnimator;
  backgroundImage: HTMLImageElement | null;
  showGridOnFog: boolean;
  showGridOnRevealed: boolean;
}

/** Dessine l'image de fond en `cover`, recadrée centrée sur la cible (G3). */
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number): void {
  const imgRatio = img.width / img.height;
  const targetRatio = width / height;
  let sx: number;
  let sy: number;
  let sw: number;
  let sh: number;

  if (imgRatio > targetRatio) {
    sh = img.height;
    sw = sh * targetRatio;
    sy = 0;
    sx = (img.width - sw) / 2;
  } else {
    sw = img.width;
    sh = sw / targetRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
}

function drawGrid(ctx: CanvasRenderingContext2D, cols: number, rows: number, width: number, height: number): void {
  const cellW = width / cols;
  const cellH = height / rows;

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= cols; c++) {
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, height);
  }
  for (let r = 0; r <= rows; r++) {
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(width, r * cellH);
  }
  ctx.stroke();
}

/** Dessine le plateau (fond, brouillard, quadrillage) sur toute la surface du canvas. */
export function drawBoard(ctx: CanvasRenderingContext2D, width: number, height: number, scene: BoardScene): void {
  ctx.clearRect(0, 0, width, height);

  if (scene.backgroundImage) {
    drawImageCover(ctx, scene.backgroundImage, width, height);
  } else {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);
  }

  if (scene.showGridOnRevealed) {
    drawGrid(ctx, scene.cols, scene.rows, width, height);
  }

  const cellW = width / scene.cols;
  const cellH = height / scene.rows;
  const [r, g, b] = FOG_COLOR;
  for (let row = 0; row < scene.rows; row++) {
    for (let col = 0; col < scene.cols; col++) {
      const index = row * scene.cols + col;
      const alpha = scene.fog.getAlpha(index);
      if (alpha <= 0) continue;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      // +1px pour éviter les liserés entre cases adjacentes lors de l'arrondi.
      ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
    }
  }

  if (scene.showGridOnFog) {
    drawGrid(ctx, scene.cols, scene.rows, width, height);
  }
}
