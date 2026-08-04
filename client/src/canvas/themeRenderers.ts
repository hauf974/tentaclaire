import type { Position } from '@tentaclaire/shared';
import type { ThemeManifest } from '../themes/types.js';

/**
 * Dessins paramétrés par thème (texture de brouillard, style de grille,
 * silhouette de fantôme). Chaque fonction retombe sur un rendu neutre par
 * défaut pour les styles pas encore implémentés — les tickets 6.4-6.7
 * ajoutent leur `case` sans toucher au reste.
 */

/** Hash déterministe 2D dans [0, 1) — jamais de `Math.random()` : le tracé doit rester stable d'une frame à l'autre. */
function hash2(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Remplissage d'une case de brouillard (fond déjà dessiné dessous). */
export function fillFogCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
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

  if (theme.fogStyle === 'parchment') {
    // Mouchetures déterministes (taches d'âge du parchemin) : 1-2 par case, position/taille fixées par hash(col,row).
    const spots = hash2(col, row) > 0.55 ? 2 : 1;
    ctx.fillStyle = theme.colors.fogFillSecondary;
    for (let i = 0; i < spots; i++) {
      const sx = x + hash2(col + i * 3.1, row) * w;
      const sy = y + hash2(col, row + i * 5.7) * h;
      const r = Math.min(w, h) * (0.06 + hash2(col + i, row + i) * 0.05);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (theme.fogStyle === 'damask') {
    // Motif damas : petit losange par case, alterné en taille/opacité selon la parité (col+row).
    const cx = x + w / 2;
    const cy = y + h / 2;
    const parity = (col + row) % 2 === 0;
    const dw = w * (parity ? 0.32 : 0.22);
    const dh = h * (parity ? 0.32 : 0.22);
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = theme.colors.fogFillSecondary;
    ctx.beginPath();
    ctx.moveTo(cx, cy - dh);
    ctx.lineTo(cx + dw, cy);
    ctx.lineTo(cx, cy + dh);
    ctx.lineTo(cx - dw, cy);
    ctx.closePath();
    ctx.fill();
  }

  if (theme.fogStyle === 'cartoon' && hash2(col, row) > 0.92) {
    // Petites chauves-souris décoratives, éparses (déterministe par case).
    const bx = x + w * (0.3 + hash2(col + 9, row) * 0.4);
    const by = y + h * (0.3 + hash2(col, row + 9) * 0.4);
    const s = Math.min(w, h) * 0.12;
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = theme.colors.torchFlame;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx - s, by - s, bx - s * 1.6, by);
    ctx.quadraticCurveTo(bx - s * 0.6, by - s * 0.2, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.6, by - s * 0.2, bx + s * 1.6, by);
    ctx.quadraticCurveTo(bx + s, by - s, bx, by);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/**
 * Nappes de brume en dérive lente (thème `cimetiere`) : quelques dégradés
 * radiaux dont la position suit une fonction sinusoïdale déphasée du temps
 * — substitut simple et peu coûteux à un vrai bruit de Perlin, même effet
 * perçu de dérive continue. Appelé une fois par frame, déjà découpé sur les
 * cases fogged par l'appelant (boardRenderer.ts).
 */
export function drawMistOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  theme: ThemeManifest,
): void {
  const t = now / 1000;
  const blobCount = 4;
  const radius = Math.min(width, height) * 0.35;

  ctx.globalAlpha = 0.22;
  for (let i = 0; i < blobCount; i++) {
    const phase = i * 1.7;
    const bx = width * (0.5 + Math.sin(t * 0.15 + phase) * 0.42);
    const by = height * (0.5 + Math.cos(t * 0.11 + phase * 1.3) * 0.42);
    const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
    gradient.addColorStop(0, theme.colors.fogFillSecondary);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
  }
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

  if (theme.gridStyle === 'irregular-ink') {
    // Traits tracés segment par segment avec un jitter déterministe : rend le
    // plan « dessiné à la main » plutôt que des lignes parfaitement droites.
    const jitter = Math.min(cellW, cellH) * 0.05;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      for (let r = 0; r < rows; r++) {
        const y0 = r * cellH + Math.sin(hash2(c, r) * Math.PI * 2) * jitter;
        const y1 = (r + 1) * cellH + Math.sin(hash2(c, r + 1) * Math.PI * 2) * jitter;
        ctx.moveTo(x + Math.sin(hash2(c, r) * 7) * jitter, y0);
        ctx.lineTo(x + Math.sin(hash2(c, r + 1) * 7) * jitter, y1);
      }
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * cellH;
      for (let c = 0; c < cols; c++) {
        const x0 = c * cellW + Math.sin(hash2(c, r) * Math.PI * 2) * jitter;
        const x1 = (c + 1) * cellW + Math.sin(hash2(c + 1, r) * Math.PI * 2) * jitter;
        ctx.moveTo(x0, y + Math.sin(hash2(c, r) * 7) * jitter);
        ctx.lineTo(x1, y + Math.sin(hash2(c + 1, r) * 7) * jitter);
      }
    }
    ctx.stroke();
    return;
  }

  if (theme.gridStyle === 'cartoon-wavy') {
    // Onde continue (pas de jitter dur) le long de chaque ligne, façon contour cartoon.
    const amp = Math.min(cellW, cellH) * 0.08;
    const steps = 12;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = c * cellW;
      for (let s = 0; s < steps * rows; s++) {
        const t = s / steps;
        const px = x + Math.sin(t * Math.PI * 2 + c) * amp;
        const py = t * cellH;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    for (let r = 0; r <= rows; r++) {
      const y = r * cellH;
      for (let s = 0; s < steps * cols; s++) {
        const t = s / steps;
        const px = t * cellW;
        const py = y + Math.sin(t * Math.PI * 2 + r) * amp;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    return;
  }

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
  if (theme.ghostShape === 'sketch') {
    // Silhouette drapée esquissée à l'encre : trait fin, remplissage clair.
    ctx.strokeStyle = theme.colors.ghostAccent;
    ctx.lineWidth = Math.max(1, size * 0.12);
    ctx.fillStyle = theme.colors.ghostFill;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.7, cy + size);
    ctx.quadraticCurveTo(cx - size * 0.9, cy - size * 0.3, cx, cy - size);
    ctx.quadraticCurveTo(cx + size * 0.9, cy - size * 0.3, cx + size * 0.7, cy + size);
    for (let i = 3; i >= 0; i--) {
      const wx = cx - size * 0.7 + (i / 3) * size * 1.4;
      ctx.quadraticCurveTo(wx - size * 0.17, cy + size * (i % 2 === 0 ? 0.75 : 1), wx - size * 0.35, cy + size);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (theme.ghostShape === 'sheet') {
    // Drap classique : dôme arrondi, bas échancré (scalloped), yeux ovales.
    const bumps = 4;
    ctx.fillStyle = theme.colors.ghostFill;
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.15, size * 0.85, Math.PI, 0);
    ctx.lineTo(cx + size * 0.85, cy + size * 0.55);
    for (let i = bumps; i >= 0; i--) {
      const bx = cx + size * 0.85 - (i / bumps) * size * 1.7;
      const bxPrev = cx + size * 0.85 - ((i + 1) / bumps) * size * 1.7;
      ctx.quadraticCurveTo((bx + bxPrev) / 2, cy + size, bx, cy + size * 0.55);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = theme.colors.ghostAccent;
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.28, cy - size * 0.1, size * 0.12, size * 0.18, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + size * 0.28, cy - size * 0.1, size * 0.12, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (theme.ghostShape === 'kawaii') {
    // Tout rond, mignon : gros yeux, joues roses.
    ctx.fillStyle = theme.colors.ghostFill;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme.colors.ghostAccent;
    ctx.beginPath();
    ctx.arc(cx - size * 0.32, cy - size * 0.05, size * 0.16, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.32, cy - size * 0.05, size * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx - size * 0.55, cy + size * 0.25, size * 0.14, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.55, cy + size * 0.25, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  if (theme.ghostShape === 'spectre') {
    // Effilé, allongé, très transparent : tête ronde discrète, corps qui s'étire et s'estompe vers le bas.
    ctx.fillStyle = theme.colors.ghostFill;
    ctx.beginPath();
    ctx.ellipse(cx, cy - size * 0.6, size * 0.45, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createLinearGradient(cx, cy - size * 0.2, cx, cy + size * 1.3);
    gradient.addColorStop(0, theme.colors.ghostFill);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.4, cy - size * 0.1);
    ctx.quadraticCurveTo(cx - size * 0.5, cy + size * 0.7, cx, cy + size * 1.3);
    ctx.quadraticCurveTo(cx + size * 0.5, cy + size * 0.7, cx + size * 0.4, cy - size * 0.1);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillStyle = theme.colors.ghostFill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
}

/** Petite tache d'encre représentant une trace de pas, opacité `alpha` selon l'ancienneté. */
export function drawFootprint(
  ctx: CanvasRenderingContext2D,
  pos: Position,
  cellW: number,
  cellH: number,
  alpha: number,
  theme: ThemeManifest,
): void {
  const cx = (pos.col + 0.5) * cellW;
  const cy = (pos.row + 0.5) * cellH;
  const r = Math.min(cellW, cellH) * 0.12;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.colors.characterFill;
  ctx.beginPath();
  ctx.arc(cx - r * 0.6, cy, r, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.6, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
