import type { Position } from '@tentaclaire/shared';
import type { FootprintMark } from './boardRenderer.js';

const MAX_ENTRIES = 6;
const FADE_MS = 1500;
const MAX_ALPHA = 0.5;

interface Entry {
  pos: Position;
  at: number;
}

export interface FootprintTrail {
  /** À appeler chaque frame : enregistre une trace quand la case logique change. `enabled` vide tout si faux (thème sans traces). */
  update(currentPos: Position, now: number, enabled: boolean): void;
  getMarks(now: number): FootprintMark[];
}

/** Traces de pas s'estompant derrière le personnage (thème `maraudeur`, D-thèmes) — position logique, pas interpolée. */
export function createFootprintTrail(): FootprintTrail {
  let entries: Entry[] = [];
  let lastPos: Position | null = null;

  return {
    update(currentPos, now, enabled) {
      if (!enabled) {
        entries = [];
        lastPos = null;
        return;
      }
      if (!lastPos || lastPos.col !== currentPos.col || lastPos.row !== currentPos.row) {
        if (lastPos) {
          entries = [...entries, { pos: lastPos, at: now }].slice(-MAX_ENTRIES);
        }
        lastPos = { ...currentPos };
      }
      entries = entries.filter((entry) => now - entry.at < FADE_MS);
    },

    getMarks(now) {
      return entries
        .filter((entry) => now - entry.at < FADE_MS)
        .map((entry) => ({
          pos: entry.pos,
          alpha: Math.max(0, 1 - (now - entry.at) / FADE_MS) * MAX_ALPHA,
        }));
    },
  };
}
