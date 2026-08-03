import type { CharacterState, CollisionMode, GhostState, Position } from '@tentaclaire/shared';

import { setCells } from './grid.js';

const INVINCIBILITY_MS = 2000;

/** Collision = personnage et fantôme sur la même case logique (J10). */
export function checkCollision(character: CharacterState, ghosts: GhostState[]): boolean {
  return ghosts.some((ghost) => ghost.pos.col === character.pos.col && ghost.pos.row === character.pos.row);
}

export interface CollisionOutcome {
  died: boolean;
  maskedIndices: number[];
  revealedIndices: number[];
}

/**
 * Applique le mode de collision (J10) : repositionne le personnage au départ
 * et déclenche l'invincibilité de 2 s (J11). `passif` ne fait rien.
 * `mortel_reinitialisation` remet tout le brouillard à 100 % puis révèle à
 * nouveau la zone de départ (`startTorchIndices`), dans cet ordre.
 */
export function applyCollision(
  mode: CollisionMode,
  character: CharacterState,
  startPos: Position,
  revealed: boolean[],
  startTorchIndices: readonly number[],
  nowMs: number,
): CollisionOutcome {
  if (mode === 'passif') {
    return { died: false, maskedIndices: [], revealedIndices: [] };
  }

  character.pos = { ...startPos };
  character.invincibleUntil = nowMs + INVINCIBILITY_MS;

  if (mode === 'mortel_reapparition') {
    return { died: true, maskedIndices: [], revealedIndices: [] };
  }

  // mortel_reinitialisation : brouillard à 100 %, puis re-révélation de la zone de départ.
  const maskedIndices = setCells(
    revealed,
    revealed.map((_, index) => index),
    false,
  );
  const revealedIndices = setCells(revealed, startTorchIndices, true);
  return { died: true, maskedIndices, revealedIndices };
}
