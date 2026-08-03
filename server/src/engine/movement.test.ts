import { describe, expect, it } from 'vitest';
import { applyDirection } from './movement.js';

describe('applyDirection — sans tore (personnage, J3)', () => {
  it('déplace normalement au centre de la grille', () => {
    expect(applyDirection({ col: 5, row: 5 }, 'up', 10, 10, false)).toEqual({ col: 5, row: 4 });
    expect(applyDirection({ col: 5, row: 5 }, 'down', 10, 10, false)).toEqual({ col: 5, row: 6 });
    expect(applyDirection({ col: 5, row: 5 }, 'left', 10, 10, false)).toEqual({ col: 4, row: 5 });
    expect(applyDirection({ col: 5, row: 5 }, 'right', 10, 10, false)).toEqual({ col: 6, row: 5 });
  });

  it('renvoie null sur les 4 bords (mur bloquant)', () => {
    expect(applyDirection({ col: 0, row: 5 }, 'left', 10, 10, false)).toBeNull();
    expect(applyDirection({ col: 9, row: 5 }, 'right', 10, 10, false)).toBeNull();
    expect(applyDirection({ col: 5, row: 0 }, 'up', 10, 10, false)).toBeNull();
    expect(applyDirection({ col: 5, row: 9 }, 'down', 10, 10, false)).toBeNull();
  });
});

describe('applyDirection — avec tore (fantômes, J4)', () => {
  it('traverse les 4 bords sans jamais renvoyer null', () => {
    expect(applyDirection({ col: 0, row: 5 }, 'left', 10, 10, true)).toEqual({ col: 9, row: 5 });
    expect(applyDirection({ col: 9, row: 5 }, 'right', 10, 10, true)).toEqual({ col: 0, row: 5 });
    expect(applyDirection({ col: 5, row: 0 }, 'up', 10, 10, true)).toEqual({ col: 5, row: 9 });
    expect(applyDirection({ col: 5, row: 9 }, 'down', 10, 10, true)).toEqual({ col: 5, row: 0 });
  });
});
