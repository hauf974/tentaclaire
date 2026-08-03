import { describe, expect, it } from 'vitest';
import { ghostFloatOffset, ghostVisualPosition } from './ghostVisuals.js';

describe('ghostVisualPosition', () => {
  it('renvoie pos si aucune cible', () => {
    const ghost = { id: 0, pos: { col: 3, row: 3 }, target: null, moveProgress: 0 };
    expect(ghostVisualPosition(ghost, 10, 10)).toEqual({ col: 3, row: 3 });
  });

  it('interpole linéairement sans passage par le bord', () => {
    const ghost = { id: 0, pos: { col: 2, row: 2 }, target: { col: 3, row: 2 }, moveProgress: 0.5 };
    const visual = ghostVisualPosition(ghost, 10, 10);
    expect(visual.col).toBeCloseTo(2.5, 5);
    expect(visual.row).toBeCloseTo(2, 5);
  });

  it('à moveProgress 0, la position visuelle = pos', () => {
    const ghost = { id: 0, pos: { col: 5, row: 5 }, target: { col: 6, row: 5 }, moveProgress: 0 };
    expect(ghostVisualPosition(ghost, 10, 10)).toEqual({ col: 5, row: 5 });
  });

  it('à moveProgress 1, la position visuelle = target', () => {
    const ghost = { id: 0, pos: { col: 5, row: 5 }, target: { col: 6, row: 5 }, moveProgress: 1 };
    const visual = ghostVisualPosition(ghost, 10, 10);
    expect(visual.col).toBeCloseTo(6, 5);
  });

  it('passe par le bord quand c\'est le chemin le plus court (tore, J4)', () => {
    // pos col=9, target col=0 sur une grille de largeur 10 : le chemin court va vers la droite (9->10=0)
    const ghost = { id: 0, pos: { col: 9, row: 0 }, target: { col: 0, row: 0 }, moveProgress: 0.5 };
    const visual = ghostVisualPosition(ghost, 10, 10);
    expect(visual.col).toBeCloseTo(9.5 % 10, 5); // continue vers la droite, pas un grand saut vers la gauche
  });
});

describe('ghostFloatOffset', () => {
  it('est borné', () => {
    for (let id = 0; id < 20; id++) {
      for (let t = 0; t < 2000; t += 100) {
        expect(Math.abs(ghostFloatOffset(id, t))).toBeLessThanOrEqual(0.08 + 1e-9);
      }
    }
  });

  it('déphase différents fantômes au même instant', () => {
    const a = ghostFloatOffset(0, 500);
    const b = ghostFloatOffset(1, 500);
    expect(a).not.toBeCloseTo(b, 5);
  });
});
