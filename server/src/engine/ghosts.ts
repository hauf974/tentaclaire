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
 * position valide, bords toriques).
 *
 * `aleatoire` : direction uniforme parmi les 4 (1 appel rng).
 * `traque` (J9) : 80 % du temps (1 appel rng pour le tirage), la direction
 * qui minimise la distance à vol d'oiseau torique jusqu'au personnage (égalité
 * -> ordre fixe up/down/left/right, déterministe, aucun appel rng
 * supplémentaire) ; les 20 % restants, direction uniforme (1 appel rng).
 */
export function chooseNextTarget(
  pos: Position,
  behavior: GhostBehavior,
  characterPos: Position,
  cols: number,
  rows: number,
  rng: () => number,
): Position {
  if (behavior === 'traque' && rng() < 0.8) {
    let best = DIRECTIONS[0];
    let bestDistance = Infinity;
    for (const direction of DIRECTIONS) {
      const candidate = applyDirection(pos, direction, cols, rows, true) as Position;
      const distance = toroidalDistance(candidate, characterPos, cols, rows);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = direction;
      }
    }
    return applyDirection(pos, best, cols, rows, true) as Position;
  }

  const direction = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
  return applyDirection(pos, direction, cols, rows, true) as Position;
}
