import { describe, expect, it } from 'vitest';
import { chooseNextTarget, spawnGhosts, toroidalDistance } from './ghosts.js';

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('spawnGhosts', () => {
  it('0 fantôme -> tableau vide', () => {
    expect(spawnGhosts(0, 10, 10, [], () => 0)).toEqual([]);
  });

  it('20 fantômes -> ids séquentiels 0..19, positions valides', () => {
    const ghosts = spawnGhosts(20, 10, 10, [], sequenceRng([0, 0.3, 0.6, 0.9]));
    expect(ghosts).toHaveLength(20);
    expect(ghosts.map((g) => g.id)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    for (const g of ghosts) {
      expect(g.pos.col).toBeGreaterThanOrEqual(0);
      expect(g.pos.col).toBeLessThan(10);
      expect(g.pos.row).toBeGreaterThanOrEqual(0);
      expect(g.pos.row).toBeLessThan(10);
    }
  });

  it('évite la zone de départ quand elle ne couvre pas toute la grille', () => {
    const startZone = [0, 1, 2, 3, 4]; // ligne du haut d'une grille 5x5
    const ghosts = spawnGhosts(10, 5, 5, startZone, sequenceRng([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]));
    for (const g of ghosts) {
      const index = g.pos.row * 5 + g.pos.col;
      expect(startZone).not.toContain(index);
    }
  });

  it('repli : si la zone de départ couvre toute la grille, spawn quand même', () => {
    const fullGrid = Array.from({ length: 25 }, (_, i) => i);
    const ghosts = spawnGhosts(3, 5, 5, fullGrid, () => 0);
    expect(ghosts).toHaveLength(3);
  });
});

describe('toroidalDistance', () => {
  it('0 pour deux positions identiques', () => {
    expect(toroidalDistance({ col: 3, row: 3 }, { col: 3, row: 3 }, 10, 10)).toBe(0);
  });

  it('distance directe quand aucun passage par le bord n\'est plus court', () => {
    expect(toroidalDistance({ col: 2, row: 2 }, { col: 5, row: 2 }, 10, 10)).toBe(3);
  });

  it('passe par le bord quand c\'est le chemin le plus court', () => {
    // colonnes 0 et 9 sur une grille de largeur 10 : écart direct 9, écart torique 1
    expect(toroidalDistance({ col: 0, row: 0 }, { col: 9, row: 0 }, 10, 10)).toBe(1);
  });
});

describe('chooseNextTarget (IA aléatoire, ticket 1.5)', () => {
  it('renvoie une position torique valide pour chacune des 4 directions', () => {
    const pos = { col: 0, row: 0 };
    const character = { col: 5, row: 5 };
    // floor(rng*4) : 0->up, 1.04/4->down, 2.04/4->left, 3.04/4->right
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, () => 0)).toEqual({ col: 0, row: 9 }); // up, tore
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, () => 0.26)).toEqual({ col: 0, row: 1 }); // down
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, () => 0.51)).toEqual({ col: 9, row: 0 }); // left, tore
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, () => 0.76)).toEqual({ col: 1, row: 0 }); // right
  });
});
