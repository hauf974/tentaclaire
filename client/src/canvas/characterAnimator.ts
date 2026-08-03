import type { CharacterState, Direction, Position } from '@tentaclaire/shared';

const MOVE_MS = 150;
const BLINK_MS = 200;
const BOUNCE_MS = 600;
const BOUNCE_AMPLITUDE = 0.15;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface CharacterAnimator {
  /** À appeler à chaque changement d'état serveur du personnage. */
  setCharacter(character: CharacterState): void;
  /** Avance l'interpolation de position de `elapsedMs` (~150 ms/case). */
  tick(elapsedMs: number): void;
  getVisualPos(): Position;
  getFacing(): Direction;
}

/** Interpole la position visuelle du personnage entre deux cases sur ~150 ms (le serveur n'envoie que des sauts discrets). */
export function createCharacterAnimator(): CharacterAnimator {
  let knownPos: Position | null = null;
  let fromPos: Position = { col: 0, row: 0 };
  let toPos: Position = { col: 0, row: 0 };
  let visualPos: Position = { col: 0, row: 0 };
  let progress = 1;
  let facing: Direction = 'down';

  return {
    setCharacter(character) {
      if (knownPos === null) {
        fromPos = character.pos;
        toPos = character.pos;
        visualPos = { ...character.pos };
        progress = 1;
      } else if (character.pos.col !== toPos.col || character.pos.row !== toPos.row) {
        fromPos = { ...visualPos }; // repart de la position visuelle actuelle, pas de saut
        toPos = { ...character.pos };
        progress = 0;
      }
      knownPos = character.pos;
      facing = character.facing;
    },

    tick(elapsedMs) {
      if (progress >= 1) return;
      progress = Math.min(1, progress + elapsedMs / MOVE_MS);
      visualPos = {
        col: lerp(fromPos.col, toPos.col, progress),
        row: lerp(fromPos.row, toPos.row, progress),
      };
    },

    getVisualPos() {
      return visualPos;
    },

    getFacing() {
      return facing;
    },
  };
}

/** Clignotement pendant l'invincibilité (J11) ; toujours visible hors invincibilité. */
export function isCharacterVisible(invincibleUntil: number | null, nowMs: number): boolean {
  if (invincibleUntil === null || nowMs >= invincibleUntil) return true;
  return Math.floor(nowMs / BLINK_MS) % 2 === 0;
}

/** Décalage vertical sinusoïdal (fraction de case) pour le sautillement en phase victory (J12). */
export function victoryBounceOffset(nowMs: number): number {
  return Math.sin((nowMs / BOUNCE_MS) * Math.PI * 2) * BOUNCE_AMPLITUDE;
}
