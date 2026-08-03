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
