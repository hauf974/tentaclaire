import type { Position, StartPosition } from '@tentaclaire/shared';

export { computeAutoGridRows } from '@tentaclaire/shared';

/** Index unique d'une case dans le tableau `revealed` (convention : row * cols + col). */
export function cellIndex(col: number, row: number, cols: number): number {
  return row * cols + col;
}

/** Les 9 positions de départ fixes (R3), ordre de lecture figé (haut-gauche -> bas-droite). */
export const FIXED_START_POSITIONS: readonly Exclude<StartPosition, 'random'>[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

/** Case de départ du personnage (R3) : une des 9 positions fixes de la grille. */
export function startingPosition(cols: number, rows: number, position: Exclude<StartPosition, 'random'>): Position {
  const [vertical, horizontal] = position.split('-') as [string, string?];
  const col = horizontal === 'left' ? 0 : horizontal === 'right' ? cols - 1 : Math.floor(cols / 2);
  const row = vertical === 'top' ? 0 : vertical === 'bottom' ? rows - 1 : Math.floor(rows / 2);
  return { col, row };
}

/**
 * Résout `startPosition` en une case concrète de la grille `cols`x`rows` :
 * pour les 9 valeurs fixes, délègue à `startingPosition` (0 appel rng,
 * comportement bit-à-bit inchangé) ; pour `'random'`, tirage uniforme sur
 * l'ensemble des cases de la grille (1 appel rng) — une vraie case au
 * hasard, pas un tirage parmi les 9 positions fixes.
 */
export function resolveStartingPosition(
  cols: number,
  rows: number,
  startPosition: StartPosition,
  rng: () => number,
): Position {
  if (startPosition !== 'random') return startingPosition(cols, rows, startPosition);
  const index = Math.floor(rng() * cols * rows);
  return { col: index % cols, row: Math.floor(index / cols) };
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
