import type { GhostState, Position } from '@tentaclaire/shared';

/**
 * Interpolation qui passe par le bord si c'est le chemin le plus court
 * (tore, J4) — un lerp direct ferait traverser tout le plateau à l'envers
 * quand la cible est de l'autre côté du bord.
 */
function lerpWrap(a: number, b: number, t: number, size: number): number {
  let delta = b - a;
  if (Math.abs(delta) > size / 2) {
    delta = delta > 0 ? delta - size : delta + size;
  }
  const value = a + delta * t;
  return ((value % size) + size) % size;
}

/** Position visuelle d'un fantôme : `pos`/`target`/`moveProgress` sont déjà diffusés en continu par le serveur. */
export function ghostVisualPosition(ghost: GhostState, cols: number, rows: number): Position {
  if (!ghost.target) return { ...ghost.pos };
  return {
    col: lerpWrap(ghost.pos.col, ghost.target.col, ghost.moveProgress, cols),
    row: lerpWrap(ghost.pos.row, ghost.target.row, ghost.moveProgress, rows),
  };
}

/** Léger flottement permanent, déphasé par fantôme (fraction de case). */
export function ghostFloatOffset(id: number, nowMs: number): number {
  const period = 1000 + (id % 5) * 137;
  return Math.sin((nowMs / period) * Math.PI * 2 + id) * 0.08;
}
