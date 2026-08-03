import type { Position } from '@tentaclaire/shared';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Index unique d'une case dans le tableau `revealed` (convention : row * cols + col). */
export function cellIndex(col: number, row: number, cols: number): number {
  return row * cols + col;
}

/** Case de départ du personnage : centre-bas de la grille (J1). */
export function startingPosition(cols: number, rows: number): Position {
  return { col: Math.floor(cols / 2), row: rows - 1 };
}

/**
 * Cases révélées par la torche : carré de Tchebychev de rayon `radius`
 * centré sur `pos`, borné à la grille (J2).
 */
export function torchCells(pos: Position, radius: 0 | 1 | 2, cols: number, rows: number): Position[] {
  const cells: Position[] = [];
  const colMin = Math.max(0, pos.col - radius);
  const colMax = Math.min(cols - 1, pos.col + radius);
  const rowMin = Math.max(0, pos.row - radius);
  const rowMax = Math.min(rows - 1, pos.row + radius);

  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      cells.push({ col, row });
    }
  }
  return cells;
}

/**
 * Nombre de lignes en mode grille automatique, calculé pour obtenir des
 * cases carrées d'après le ratio de l'image (G4). Le moteur ne l'appelle
 * pas lui-même : c'est Lot 2, qui connaît les dimensions de l'image
 * active, qui résout `gridRows` avant de construire/réinitialiser le jeu.
 */
export function computeAutoGridRows(cols: number, imageWidth: number, imageHeight: number): number {
  return clamp(Math.round((cols * imageHeight) / imageWidth), 5, 50);
}

/** Grille de brouillard initiale : toutes les cases masquées. */
export function createEmptyRevealed(cols: number, rows: number): boolean[] {
  return new Array<boolean>(cols * rows).fill(false);
}

/**
 * Applique `value` aux cases `indices` dans `revealed` (mutation en place).
 * Renvoie uniquement les index dont l'état a réellement changé (dédoublonné),
 * prêt à être diffusé dans un événement `revealed_changed`.
 */
export function setCells(revealed: boolean[], indices: Iterable<number>, value: boolean): number[] {
  const changed: number[] = [];
  const seen = new Set<number>();
  for (const index of indices) {
    if (seen.has(index)) continue;
    seen.add(index);
    if (revealed[index] !== value) {
      revealed[index] = value;
      changed.push(index);
    }
  }
  return changed;
}

/** Victoire (J12) : 100 % des cases révélées. */
export function isFullyRevealed(revealed: boolean[]): boolean {
  return revealed.every((cell) => cell);
}
