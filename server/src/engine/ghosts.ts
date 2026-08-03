import type { Direction, GhostBehavior, Position } from '@tentaclaire/shared';

import { applyDirection } from './movement.js';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export interface SpawnedGhost {
  id: number;
  pos: Position;
}

/**
 * Positions de spawn des fantômes (J7) : cellules choisies aléatoirement hors
 * de `startZoneIndices` (la zone de départ du personnage). Repli : si cette
 * zone couvre 100 % de la grille (grille minimale + rayon de torche maximal),
 * n'importe quelle cellule redevient éligible plutôt que de ne jamais spawner.
 */
export function spawnGhosts(
  count: number,
  cols: number,
  rows: number,
  startZoneIndices: readonly number[],
  rng: () => number,
): SpawnedGhost[] {
  const startZone = new Set(startZoneIndices);
  const allIndices = Array.from({ length: cols * rows }, (_, index) => index);
  const candidates = allIndices.filter((index) => !startZone.has(index));
  const pool = candidates.length > 0 ? candidates : allIndices;

  const ghosts: SpawnedGhost[] = [];
  for (let id = 0; id < count; id++) {
    const index = pool[Math.floor(rng() * pool.length)];
    ghosts.push({ id, pos: { col: index % cols, row: Math.floor(index / cols) } });
  }
  return ghosts;
}

/**
 * Distance à vol d'oiseau entre deux cases, modulo le tore (J9) : sur chaque
 * axe, l'écart le plus court peut passer par le bord.
 */
export function toroidalDistance(a: Position, b: Position, cols: number, rows: number): number {
  const dCol = Math.min(Math.abs(a.col - b.col), cols - Math.abs(a.col - b.col));
  const dRow = Math.min(Math.abs(a.row - b.row), rows - Math.abs(a.row - b.row));
  return Math.sqrt(dCol * dCol + dRow * dRow);
}

/**
 * Choisit la prochaine case cible d'un fantôme depuis `pos` (toujours une
 * position valide, bords toriques). Ticket 1.5 : IA `aleatoire` uniquement
 * (`behavior`/`characterPos` ne sont pas encore utilisés — traque en 1.6).
 */
export function chooseNextTarget(
  pos: Position,
  behavior: GhostBehavior,
  characterPos: Position,
  cols: number,
  rows: number,
  rng: () => number,
): Position {
  const direction = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
  return applyDirection(pos, direction, cols, rows, true) as Position;
}
