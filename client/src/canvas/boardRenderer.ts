import type { Direction, Position } from '@tentaclaire/shared';

import type { FogAnimator } from './fogAnimator.js';

// Thème neutre fonctionnel (le thème « Carte du Maraudeur » arrive au Lot 6).
const FOG_COLOR = [20, 24, 38] as const;
const BACKGROUND_COLOR = '#2a2f3a';
const GRID_COLOR = 'rgba(255, 255, 255, 0.15)';
const CHARACTER_COLOR = '#f4d35e';
const GHOST_COLOR = 'rgba(220, 220, 255, 0.85)';

const DIRECTION_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export interface CharacterSprite {
  visualPos: Position;
  facing: Direction;
  visible: boolean;
  bounceOffset: number;
}

export interface GhostSprite {
  visualPos: Position;
  floatOffset: number;
}

export interface BoardScene {
  cols: number;
  rows: number;
  fog: FogAnimator;
  backgroundImage: HTMLImageElement | null;
  showGridOnFog: boolean;
  showGridOnRevealed: boolean;
  character: CharacterSprite | null;
  ghosts: GhostSprite[];
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

/** Chemin couvrant les cases dont l'état (fogged/révélé, seuil sur l'alpha d'animation) satisfait `predicate`. */
function cellsClipPath(
  cols: number,
  rows: number,
  width: number,
  height: number,
  fog: FogAnimator,
  predicate: (alpha: number) => boolean,
): Path2D {
  const cellW = width / cols;
  const cellH = height / rows;
  const path = new Path2D();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const alpha = fog.getAlpha(row * cols + col);
      if (!predicate(alpha)) continue;
      path.rect(col * cellW, row * cellH, cellW + 1, cellH + 1);
    }
  }
  return path;
}

/**
 * Quadrillage : deux toggles indépendants par état de case (G5), dessiné
 * au-dessus du brouillard (jamais masqué par sa transparence) et découpé
 * par case via un chemin de clip — plutôt que deux tracés pleine grille
 * empilés, dont celui du dessous restait visible en transparence à travers
 * le brouillard malgré `showGridOnFog` désactivé.
 */
function drawGridByState(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  width: number,
  height: number,
  fog: FogAnimator,
  showGridOnFog: boolean,
  showGridOnRevealed: boolean,
): void {
  if (showGridOnFog) {
    ctx.save();
    ctx.clip(cellsClipPath(cols, rows, width, height, fog, (alpha) => alpha > 0.5));
    drawGrid(ctx, cols, rows, width, height);
    ctx.restore();
  }
  if (showGridOnRevealed) {
    ctx.save();
    ctx.clip(cellsClipPath(cols, rows, width, height, fog, (alpha) => alpha <= 0.5));
    drawGrid(ctx, cols, rows, width, height);
    ctx.restore();
  }
}

/** Personnage (D4) : smiley rond, lunettes rondes, torche dans la direction `facing`. */
function drawCharacter(ctx: CanvasRenderingContext2D, cellW: number, cellH: number, sprite: CharacterSprite): void {
  if (!sprite.visible) return;

  const cx = (sprite.visualPos.col + 0.5) * cellW;
  const cy = (sprite.visualPos.row + 0.5 + sprite.bounceOffset) * cellH;
  const radius = Math.min(cellW, cellH) * 0.35;

  ctx.fillStyle = CHARACTER_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#222';
  ctx.lineWidth = Math.max(1, radius * 0.12);
  const eyeOffsetX = radius * 0.4;
  const eyeOffsetY = radius * 0.15;
  ctx.beginPath();
  ctx.arc(cx - eyeOffsetX, cy - eyeOffsetY, radius * 0.25, 0, Math.PI * 2);
  ctx.moveTo(cx + eyeOffsetX + radius * 0.25, cy - eyeOffsetY);
  ctx.arc(cx + eyeOffsetX, cy - eyeOffsetY, radius * 0.25, 0, Math.PI * 2);
  ctx.stroke();

  const dir = DIRECTION_VECTORS[sprite.facing];
  ctx.fillStyle = '#ffdd66';
  ctx.beginPath();
  ctx.arc(cx + dir.dx * radius * 1.6, cy + dir.dy * radius * 1.6, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawGhost(ctx: CanvasRenderingContext2D, cellW: number, cellH: number, sprite: GhostSprite): void {
  const cx = (sprite.visualPos.col + 0.5) * cellW;
  const cy = (sprite.visualPos.row + 0.5 + sprite.floatOffset) * cellH;
  const size = Math.min(cellW, cellH) * 0.3;

  ctx.fillStyle = GHOST_COLOR;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
}

/** Dessine le plateau (fond, brouillard, quadrillage, personnage, fantômes) sur toute la surface du canvas. */
export function drawBoard(ctx: CanvasRenderingContext2D, width: number, height: number, scene: BoardScene): void {
  ctx.clearRect(0, 0, width, height);

  if (scene.backgroundImage) {
    drawImageCover(ctx, scene.backgroundImage, width, height);
  } else {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);
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

  drawGridByState(ctx, scene.cols, scene.rows, width, height, scene.fog, scene.showGridOnFog, scene.showGridOnRevealed);

  // Personnage et fantômes toujours visibles au-dessus du brouillard/quadrillage.
  for (const ghost of scene.ghosts) {
    drawGhost(ctx, cellW, cellH, ghost);
  }
  if (scene.character) {
    drawCharacter(ctx, cellW, cellH, scene.character);
  }
}
