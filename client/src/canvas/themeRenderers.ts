import type { ThemeManifest } from '../themes/types.js';

/**
 * Dessins paramétrés par thème (texture de brouillard, style de grille,
 * silhouette de fantôme). Chaque fonction retombe sur un rendu neutre par
 * défaut pour les styles pas encore implémentés — les tickets 6.3-6.7
 * ajoutent leur `case` sans toucher au reste (ticket 6.1 : infrastructure
 * seule, tous les styles pointent encore vers ce fallback).
 */

/** Remplissage d'une case de brouillard (fond déjà dessiné dessous). */
export function fillFogCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number,
  theme: ThemeManifest,
): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.colors.fogFill;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

/** Trace les lignes de grille sur toute la zone (le clip par case est géré par l'appelant). */
export function strokeGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  width: number,
  height: number,
  theme: ThemeManifest,
): void {
  const cellW = width / cols;
  const cellH = height / rows;

  ctx.strokeStyle = theme.colors.grid;
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

/**
 * Corps du personnage (D4 : silhouette ronde constante entre thèmes) avec
 * variation de trait par thème : contour irrégulier à l'encre (`sketchy`,
 * jitter déterministe sur l'angle — pas de RNG par frame, sinon le tracé
 * scintillerait) ou lumineux (`glow`, `shadowBlur` limité à cette forme).
 */
export function drawCharacterBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  theme: ThemeManifest,
): void {
  if (theme.characterLineStyle === 'glow') {
    ctx.save();
    ctx.shadowColor = theme.colors.characterAccent;
    ctx.shadowBlur = radius * 0.8;
    ctx.fillStyle = theme.colors.characterFill;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (theme.characterLineStyle === 'sketchy') {
    const segments = 24;
    const jitter = radius * 0.06;
    ctx.fillStyle = theme.colors.characterFill;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius + Math.sin(angle * 7) * jitter;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillStyle = theme.colors.characterFill;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Silhouette d'un fantôme centrée sur (cx, cy), taille `size`. */
export function drawGhostShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  theme: ThemeManifest,
): void {
  ctx.fillStyle = theme.colors.ghostFill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
}
