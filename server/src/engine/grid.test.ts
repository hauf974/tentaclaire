import { describe, expect, it } from 'vitest';
import {
  cellIndex,
  computeAutoGridRows,
  createEmptyRevealed,
  FIXED_START_POSITIONS,
  isFullyRevealed,
  resolveStartPosition,
  setCells,
  startingPosition,
  torchCells,
} from './grid.js';

describe('cellIndex', () => {
  it('calcule index = row * cols + col', () => {
    expect(cellIndex(0, 0, 10)).toBe(0);
    expect(cellIndex(3, 2, 10)).toBe(23);
    expect(cellIndex(9, 9, 10)).toBe(99);
  });
});

describe('startingPosition', () => {
  it('bottom-center équivaut au comportement historique centre-bas (J1)', () => {
    expect(startingPosition(10, 10, 'bottom-center')).toEqual({ col: 5, row: 9 });
    expect(startingPosition(5, 5, 'bottom-center')).toEqual({ col: 2, row: 4 });
    expect(startingPosition(7, 3, 'bottom-center')).toEqual({ col: 3, row: 2 });
  });

  it.each([
    ['top-left', { col: 0, row: 0 }],
    ['top-center', { col: 2, row: 0 }],
    ['top-right', { col: 4, row: 0 }],
    ['middle-left', { col: 0, row: 2 }],
    ['center', { col: 2, row: 2 }],
    ['middle-right', { col: 4, row: 2 }],
    ['bottom-left', { col: 0, row: 4 }],
    ['bottom-center', { col: 2, row: 4 }],
    ['bottom-right', { col: 4, row: 4 }],
  ] as const)('grille impaire 5x5 : %s -> %o', (position, expected) => {
    expect(startingPosition(5, 5, position)).toEqual(expected);
  });

  it.each([
    ['top-left', { col: 0, row: 0 }],
    ['top-center', { col: 5, row: 0 }],
    ['top-right', { col: 9, row: 0 }],
    ['middle-left', { col: 0, row: 4 }],
    ['center', { col: 5, row: 4 }],
    ['middle-right', { col: 9, row: 4 }],
    ['bottom-left', { col: 0, row: 7 }],
    ['bottom-center', { col: 5, row: 7 }],
    ['bottom-right', { col: 9, row: 7 }],
  ] as const)('grille paire 10x8 : %s -> %o', (position, expected) => {
    expect(startingPosition(10, 8, position)).toEqual(expected);
  });
});

describe('resolveStartPosition', () => {
  it('les 9 valeurs fixes passent inchangées, sans appel rng', () => {
    for (const position of FIXED_START_POSITIONS) {
      const noRng = (): number => {
        throw new Error('rng ne devrait pas être appelé pour une position fixe');
      };
      expect(resolveStartPosition(position, noRng)).toBe(position);
    }
  });

  it('"random" consomme exactement 1 appel rng et respecte le mapping des 9 tranches', () => {
    // bornes incluses : rng=0 -> premier élément (top-left), rng juste sous 1 -> dernier (bottom-right)
    expect(resolveStartPosition('random', () => 0)).toBe('top-left');
    expect(resolveStartPosition('random', () => 0.999)).toBe('bottom-right');

    FIXED_START_POSITIONS.forEach((expected, index) => {
      const rngValue = (index + 0.5) / FIXED_START_POSITIONS.length; // milieu de chaque dixième
      expect(resolveStartPosition('random', () => rngValue)).toBe(expected);
    });

    let calls = 0;
    resolveStartPosition('random', () => {
      calls++;
      return 0;
    });
    expect(calls).toBe(1);
  });
});

describe('torchCells', () => {
  it('radius 0 : uniquement la case occupée', () => {
    expect(torchCells({ col: 5, row: 5 }, 0, 10, 10)).toEqual([{ col: 5, row: 5 }]);
  });

  it('radius 1 : carré 3x3 loin des bords', () => {
    const cells = torchCells({ col: 5, row: 5 }, 1, 10, 10);
    expect(cells).toHaveLength(9);
    expect(cells).toContainEqual({ col: 4, row: 4 });
    expect(cells).toContainEqual({ col: 6, row: 6 });
  });

  it('radius 2 : carré 5x5 loin des bords', () => {
    expect(torchCells({ col: 10, row: 10 }, 2, 25, 25)).toHaveLength(25);
  });

  it('borne aux quatre coins de la grille', () => {
    const cols = 10;
    const rows = 10;
    // coin haut-gauche : radius 1 -> seulement 2x2 (pas de col/row négatifs)
    expect(torchCells({ col: 0, row: 0 }, 1, cols, rows)).toHaveLength(4);
    // coin haut-droit
    expect(torchCells({ col: cols - 1, row: 0 }, 1, cols, rows)).toHaveLength(4);
    // coin bas-gauche
    expect(torchCells({ col: 0, row: rows - 1 }, 1, cols, rows)).toHaveLength(4);
    // coin bas-droit, radius 2 -> 3x3 (bordé par la grille des deux côtés)
    expect(torchCells({ col: cols - 1, row: rows - 1 }, 2, cols, rows)).toHaveLength(9);
  });
});

describe('computeAutoGridRows', () => {
  it('16:9', () => {
    expect(computeAutoGridRows(16, 1920, 1080)).toBe(9);
  });

  it('1:1', () => {
    expect(computeAutoGridRows(10, 1000, 1000)).toBe(10);
  });

  it('9:16 (portrait)', () => {
    expect(computeAutoGridRows(9, 1080, 1920)).toBe(16);
  });

  it('ratio extrême très large : borné à 5', () => {
    expect(computeAutoGridRows(50, 10000, 1)).toBe(5);
  });

  it('ratio extrême très haut : borné à 50', () => {
    expect(computeAutoGridRows(5, 1, 10000)).toBe(50);
  });
});

describe('createEmptyRevealed', () => {
  it('crée une grille entièrement masquée', () => {
    const revealed = createEmptyRevealed(10, 5);
    expect(revealed).toHaveLength(50);
    expect(revealed.every((cell) => cell === false)).toBe(true);
  });
});

describe('setCells', () => {
  it('révèle des cases et renvoie les index modifiés', () => {
    const revealed = createEmptyRevealed(5, 5);
    const changed = setCells(revealed, [0, 1, 2], true);
    expect(changed).toEqual([0, 1, 2]);
    expect(revealed[0]).toBe(true);
  });

  it('ne renvoie rien pour des cases déjà dans le bon état', () => {
    const revealed = createEmptyRevealed(5, 5);
    setCells(revealed, [0], true);
    expect(setCells(revealed, [0], true)).toEqual([]);
  });

  it('dédoublonne les index en entrée', () => {
    const revealed = createEmptyRevealed(5, 5);
    expect(setCells(revealed, [3, 3, 3], true)).toEqual([3]);
  });

  it('masque des cases précédemment révélées', () => {
    const revealed = createEmptyRevealed(5, 5);
    setCells(revealed, [0, 1], true);
    expect(setCells(revealed, [0], false)).toEqual([0]);
    expect(revealed[0]).toBe(false);
    expect(revealed[1]).toBe(true);
  });
});

describe('isFullyRevealed', () => {
  it('faux si au moins une case masquée', () => {
    const revealed = new Array(10).fill(true);
    revealed[5] = false;
    expect(isFullyRevealed(revealed)).toBe(false);
  });

  it('vrai exactement quand toutes les cases sont révélées', () => {
    expect(isFullyRevealed(new Array(10).fill(true))).toBe(true);
  });
});
