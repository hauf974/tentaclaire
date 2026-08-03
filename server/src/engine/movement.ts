import type { Direction, Position } from '@tentaclaire/shared';

const DELTAS: Record<Direction, { dCol: number; dRow: number }> = {
  up: { dCol: 0, dRow: -1 },
  down: { dCol: 0, dRow: 1 },
  left: { dCol: -1, dRow: 0 },
  right: { dCol: 1, dRow: 0 },
};

/**
 * Applique un déplacement d'une case dans `direction`.
 * `wrap=false` (personnage, J3) : renvoie `null` si la destination sort de la
 * grille (mur bloquant). `wrap=true` (fantômes, J4) : arithmétique modulaire,
 * toujours une position valide (tore).
 */
export function applyDirection(
  pos: Position,
  direction: Direction,
  cols: number,
  rows: number,
  wrap: boolean,
): Position | null {
  const { dCol, dRow } = DELTAS[direction];
  const col = pos.col + dCol;
  const row = pos.row + dRow;

  if (wrap) {
    return { col: ((col % cols) + cols) % cols, row: ((row % rows) + rows) % rows };
  }
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { col, row };
}

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

/**
 * Résout une fenêtre de vote (J6) : direction majoritaire ; égalité -> tirage
 * au sort `rng` parmi les ex æquo ; zéro vote -> `null` (immobile).
 */
export function resolveVoteWindow(votes: Record<Direction, number>, rng: () => number): Direction | null {
  const max = Math.max(...DIRECTIONS.map((d) => votes[d]));
  if (max === 0) return null;

  const tied = DIRECTIONS.filter((d) => votes[d] === max);
  if (tied.length === 1) return tied[0];
  return tied[Math.floor(rng() * tied.length)];
}
