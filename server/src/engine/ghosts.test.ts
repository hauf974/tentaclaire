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
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, [], () => 0)).toEqual({ col: 0, row: 9 }); // up, tore
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, [], () => 0.26)).toEqual({ col: 0, row: 1 }); // down
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, [], () => 0.51)).toEqual({ col: 9, row: 0 }); // left, tore
    expect(chooseNextTarget(pos, 'aleatoire', character, 10, 10, [], () => 0.76)).toEqual({ col: 1, row: 0 }); // right
  });
});

describe('chooseNextTarget (IA traque, ticket 1.6)', () => {
  it('choisit la direction qui minimise la distance directe au personnage', () => {
    // personnage 2 colonnes à droite, sans intérêt pour le tore : right est optimal sans ambiguïté
    const target = chooseNextTarget({ col: 0, row: 0 }, 'traque', { col: 2, row: 0 }, 10, 10, [], sequenceRng([0]));
    expect(target).toEqual({ col: 1, row: 0 });
  });

  it('reconnaît le chemin le plus court via le tore (J9)', () => {
    // personnage en (9,0) : à 9 cases en direct, à 1 case via le bord -> left (tore) est optimal
    const target = chooseNextTarget({ col: 0, row: 0 }, 'traque', { col: 9, row: 0 }, 10, 10, [], sequenceRng([0]));
    expect(target).toEqual({ col: 9, row: 0 });
  });

  it('20 % du temps, direction aléatoire au lieu de traquer', () => {
    // rng >= 0.8 -> bascule sur la branche aléatoire ; ensuite floor(0.51*4)=2 -> left
    const target = chooseNextTarget({ col: 5, row: 5 }, 'traque', { col: 0, row: 0 }, 10, 10, [], sequenceRng([0.9, 0.51]));
    expect(target).toEqual({ col: 4, row: 5 }); // left, alors que traquer aurait donné up ou left selon la distance
  });

  it('converge statistiquement vers le personnage avec un rng biaisé (toujours traque)', () => {
    const character = { col: 5, row: 5 };
    let pos = { col: 0, row: 0 };
    const rng = () => 0; // < 0.8 en permanence -> toujours la branche traque, déterministe

    let previousDistance = toroidalDistance(pos, character, 10, 10);
    for (let i = 0; i < 10; i++) {
      pos = chooseNextTarget(pos, 'traque', character, 10, 10, [], rng);
      const distance = toroidalDistance(pos, character, 10, 10);
      expect(distance).toBeLessThanOrEqual(previousDistance);
      previousDistance = distance;
    }
    expect(previousDistance).toBeLessThanOrEqual(1);
  });
});

describe('chooseNextTarget (IA extinction des feux, ticket 8.1)', () => {
  const character = { col: 0, row: 0 }; // non pertinent pour ce comportement

  it('80 % du temps, se rapproche de la case révélée la plus proche', () => {
    // fantôme en (0,0), grille 10x10, une seule case révélée en (2,0) -> right est optimal
    const revealed = new Array(100).fill(false);
    revealed[2] = true; // (col:2, row:0)
    const target = chooseNextTarget({ col: 0, row: 0 }, 'extinction', character, 10, 10, revealed, sequenceRng([0]));
    expect(target).toEqual({ col: 1, row: 0 });
  });

  it('départage deux cases révélées équidistantes par le plus petit index', () => {
    const cols = 10;
    const rows = 10;
    const revealed = new Array(cols * rows).fill(false);
    const posA = { col: 3, row: 5 }; // index 53, distance 2 depuis (5,5)
    const posB = { col: 7, row: 5 }; // index 57, distance 2 depuis (5,5)
    revealed[posA.row * cols + posA.col] = true;
    revealed[posB.row * cols + posB.col] = true;
    // les deux cases sont à distance égale (2) du fantôme -> la plus petit index (53, posA, à gauche) l'emporte
    const target = chooseNextTarget({ col: 5, row: 5 }, 'extinction', character, cols, rows, revealed, sequenceRng([0]));
    expect(target).toEqual({ col: 4, row: 5 }); // left, en direction de posA
  });

  it('reconnaît le chemin le plus court via le tore (J9)', () => {
    // fantôme en (0,0), grille 10x10, case révélée en (9,0) : 9 cases en direct, 1 case via le bord -> left
    const revealed = new Array(100).fill(false);
    revealed[9] = true; // (col:9, row:0)
    const target = chooseNextTarget({ col: 0, row: 0 }, 'extinction', character, 10, 10, revealed, sequenceRng([0]));
    expect(target).toEqual({ col: 9, row: 0 });
  });

  it('exclut la case occupée par le fantôme des candidates', () => {
    // seule case révélée = celle du fantôme -> aucune candidate -> repli aléatoire (2e valeur du rng)
    const revealed = new Array(100).fill(false);
    revealed[0] = true; // (col:0, row:0), la case du fantôme
    // rng: 0 -> <0.8 (branche extinction) ; puis 0 -> floor(0*4)=0 -> up
    const target = chooseNextTarget({ col: 0, row: 0 }, 'extinction', character, 10, 10, revealed, sequenceRng([0, 0]));
    expect(target).toEqual({ col: 0, row: 9 }); // up, tore
  });

  it('repli direction aléatoire quand rien n\'est révélé hors de la case du fantôme', () => {
    const revealed = new Array(100).fill(false);
    // rng: 0 -> <0.8 (branche extinction, aucune candidate) ; puis 0.51 -> floor(0.51*4)=2 -> left
    const target = chooseNextTarget({ col: 5, row: 5 }, 'extinction', character, 10, 10, revealed, sequenceRng([0, 0.51]));
    expect(target).toEqual({ col: 4, row: 5 });
  });

  it('20 % du temps, direction aléatoire indépendamment des cases révélées', () => {
    const revealed = new Array(100).fill(false);
    revealed[2] = true; // case révélée proche, ignorée par la branche aléatoire
    // rng >= 0.8 -> bascule direction aléatoire ; puis 0.51 -> floor(0.51*4)=2 -> left
    const target = chooseNextTarget({ col: 0, row: 0 }, 'extinction', character, 10, 10, revealed, sequenceRng([0.9, 0.51]));
    expect(target).toEqual({ col: 9, row: 0 }); // left, tore
  });

  it('nombre d\'appels rng identique à traque sur les mêmes branches', () => {
    const revealed = new Array(100).fill(false);
    revealed[2] = true;

    let calls = 0;
    const countingRng = (values: number[]) => () => {
      calls++;
      return values[Math.min(calls - 1, values.length - 1)];
    };

    calls = 0;
    chooseNextTarget({ col: 0, row: 0 }, 'extinction', character, 10, 10, revealed, countingRng([0]));
    expect(calls).toBe(1); // 80 % avec candidate trouvée : 1 appel, comme traque

    calls = 0;
    chooseNextTarget({ col: 0, row: 0 }, 'extinction', character, 10, 10, revealed, countingRng([0.9, 0.51]));
    expect(calls).toBe(2); // 20 % : 1 appel pour le tirage + 1 pour la direction, comme traque

    calls = 0;
    chooseNextTarget({ col: 0, row: 0 }, 'extinction', character, 10, 10, [], countingRng([0, 0.51]));
    expect(calls).toBe(2); // 80 % sans candidate (repli) : même total que la branche 20 %
  });
});
