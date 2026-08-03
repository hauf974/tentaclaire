import { defaultGameConfig, type GameConfig } from '@tentaclaire/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, type GameEngine } from './game.js';

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  // ghostCount: 0 par défaut pour ces tests (phases/chaos/démocratie) : les
  // fantômes ont leur propre suite dédiée plus bas, avec un rng contrôlé.
  return { ...defaultGameConfig, gridCols: 6, gridRows: 6, ghostCount: 0, ...overrides };
}

function noRng(): number {
  throw new Error('rng ne devrait pas être appelé dans ce ticket');
}

function fixedRng(value: number): () => number {
  return () => value;
}

describe('createGame — phases et timer', () => {
  let clock: number;
  let game: GameEngine;

  beforeEach(() => {
    clock = 0;
    game = createGame(config(), noRng, () => clock);
  });

  it("démarre en phase 'idle' avec un plateau valide", () => {
    const state = game.getState();
    expect(state.phase).toBe('idle');
    expect(state.character.pos).toEqual({ col: 3, row: 5 });
    expect(state.revealed.some(Boolean)).toBe(true);
  });

  it("reset() depuis 'idle' passe en 'reset', révèle la zone de départ et émet 'reset'", () => {
    game.reset();
    expect(game.getState().phase).toBe('reset');
    expect(game.getState().timerRemainingMs).toBe(defaultGameConfig.timerSeconds * 1000);
    const events = game.drainEvents();
    expect(events.map((e) => e.type)).toContain('reset');
  });

  it("launch() depuis 'reset' passe en 'running' sans émettre 'resumed'", () => {
    game.reset();
    game.drainEvents();
    game.launch();
    expect(game.getState().phase).toBe('running');
    expect(game.drainEvents().map((e) => e.type)).not.toContain('resumed');
  });

  it("launch() est ignoré depuis 'idle', 'running', 'victory' ou 'defeat'", () => {
    game.launch(); // idle -> ignoré
    expect(game.getState().phase).toBe('idle');

    game.reset();
    game.launch(); // reset -> running (valide)
    game.launch(); // running -> running : ignoré, pas de re-déclenchement
    expect(game.getState().phase).toBe('running');
  });

  it("pause() depuis 'running' passe en 'paused' et émet 'paused'", () => {
    game.reset();
    game.launch();
    game.drainEvents();
    game.pause();
    expect(game.getState().phase).toBe('paused');
    expect(game.drainEvents().map((e) => e.type)).toContain('paused');
  });

  it("pause() est ignoré hors de 'running'", () => {
    game.pause(); // idle
    expect(game.getState().phase).toBe('idle');
    game.reset();
    game.pause(); // reset
    expect(game.getState().phase).toBe('reset');
  });

  it("launch() depuis 'paused' repasse en 'running' et émet 'resumed'", () => {
    game.reset();
    game.launch();
    game.pause();
    game.drainEvents();
    game.launch();
    expect(game.getState().phase).toBe('running');
    expect(game.drainEvents().map((e) => e.type)).toContain('resumed');
  });

  it('reset() fonctionne depuis toutes les phases', () => {
    game.reset();
    game.launch();
    game.pause();
    game.reset();
    expect(game.getState().phase).toBe('reset');
  });

  it('le timer décroît uniquement en running, au rythme du delta réel', () => {
    game.reset();
    game.launch();
    clock = 1000;
    game.tick(clock); // premier tick : établit la référence, pas de décrément
    expect(game.getState().timerRemainingMs).toBe(defaultGameConfig.timerSeconds * 1000);

    clock = 1400;
    game.tick(clock);
    expect(game.getState().timerRemainingMs).toBe(defaultGameConfig.timerSeconds * 1000 - 400);
  });

  it('pause() fige le timer même après un grand saut de temps', () => {
    game.reset();
    game.launch();
    clock = 1000;
    game.tick(clock);
    clock = 1500;
    game.tick(clock);
    const frozen = game.getState().timerRemainingMs;
    game.pause();
    clock = 100000; // grand saut de temps pendant la pause
    game.tick(clock);
    expect(game.getState().timerRemainingMs).toBe(frozen);
  });

  it('défaite pile à 0 : brouillard remis à 100 %, phase figée', () => {
    const g = createGame(config({ timerSeconds: 1 }), noRng, () => clock);
    g.reset();
    g.launch();
    clock = 1000;
    g.tick(clock); // référence initiale
    clock = 1500;
    g.tick(clock);
    expect(g.getState().timerRemainingMs).toBe(500);
    expect(g.getState().phase).toBe('running');

    clock = 2000;
    g.tick(clock);
    expect(g.getState().timerRemainingMs).toBe(0);
    expect(g.getState().phase).toBe('defeat');
    expect(g.getState().revealed.some(Boolean)).toBe(false);
    expect(g.drainEvents().map((e) => e.type)).toContain('defeat');

    // la partie reste figée après la défaite, même avec un nouveau tick
    clock = 5000;
    g.tick(clock);
    expect(g.getState().timerRemainingMs).toBe(0);
    expect(g.getState().phase).toBe('defeat');
  });
});

describe('createGame — mode Chaos (J5)', () => {
  let clock: number;
  let game: GameEngine;

  beforeEach(() => {
    clock = 0;
    game = createGame(config(), noRng, () => clock); // config() = movementMode 'chaos' par défaut
    game.reset();
    game.launch();
  });

  it("handleInput ignoré hors de la phase 'running'", () => {
    game.pause();
    game.drainEvents();
    game.handleInput('up', 'Alex');
    expect(game.getState().character.pos).toEqual({ col: 3, row: 5 });
    expect(game.drainEvents()).toEqual([]);
  });

  it('émet character_moved, revealed_changed et input_accepted pour un déplacement valide', () => {
    game.drainEvents();
    game.handleInput('up', 'Alex');
    const events = game.drainEvents();

    expect(events).toContainEqual({ type: 'input_accepted', pseudo: 'Alex', direction: 'up' });
    const moved = events.find((e) => e.type === 'character_moved');
    expect(moved).toBeDefined();
    if (moved?.type === 'character_moved') {
      expect(moved.character.pos).toEqual({ col: 3, row: 4 });
      expect(moved.character.facing).toBe('up');
    }
    expect(events.some((e) => e.type === 'revealed_changed')).toBe(true);
  });

  it('spam pendant le cooldown : ignoré, sans re-générer d\'événements', () => {
    game.handleInput('up', 'Alex'); // clock=0, accepté
    expect(game.getState().character.pos).toEqual({ col: 3, row: 4 });
    game.drainEvents();

    game.handleInput('up', 'Alex');
    game.handleInput('up', 'Alex');
    game.handleInput('up', 'Alex');
    expect(game.getState().character.pos).toEqual({ col: 3, row: 4 });
    expect(game.drainEvents()).toEqual([]);
  });

  it('mur bloquant en bas (départ) : ignoré sans consommer le cooldown', () => {
    game.drainEvents();
    game.handleInput('down', 'Alex'); // déjà sur la dernière ligne
    expect(game.getState().character.pos).toEqual({ col: 3, row: 5 });
    expect(game.drainEvents()).toEqual([]);

    // le cooldown n'a pas démarré : un déplacement valide au même instant fonctionne
    game.handleInput('up', 'Alex');
    expect(game.getState().character.pos).toEqual({ col: 3, row: 4 });
  });

  it('mur bloquant en haut', () => {
    for (let i = 0; i < 5; i++) {
      clock += 500;
      game.handleInput('up', 'Alex');
    }
    expect(game.getState().character.pos).toEqual({ col: 3, row: 0 });
    game.drainEvents();

    game.handleInput('up', 'Alex');
    expect(game.getState().character.pos).toEqual({ col: 3, row: 0 });
    expect(game.drainEvents()).toEqual([]);
  });

  it('mur bloquant à gauche', () => {
    for (let i = 0; i < 3; i++) {
      clock += 500;
      game.handleInput('left', 'Alex');
    }
    expect(game.getState().character.pos).toEqual({ col: 0, row: 5 });
    game.drainEvents();

    game.handleInput('left', 'Alex');
    expect(game.getState().character.pos).toEqual({ col: 0, row: 5 });
    expect(game.drainEvents()).toEqual([]);
  });

  it('mur bloquant à droite', () => {
    for (let i = 0; i < 2; i++) {
      clock += 500;
      game.handleInput('right', 'Alex');
    }
    expect(game.getState().character.pos).toEqual({ col: 5, row: 5 });
    game.drainEvents();

    game.handleInput('right', 'Alex');
    expect(game.getState().character.pos).toEqual({ col: 5, row: 5 });
    expect(game.drainEvents()).toEqual([]);
  });

  it('respecte un cooldown configuré à 100 ms', () => {
    const g = createGame(config({ chaosCooldownMs: 100 }), noRng, () => clock);
    g.reset();
    g.launch();
    g.handleInput('up', 'Alex'); // clock=0
    clock = 99;
    g.handleInput('up', 'Alex'); // encore dans le cooldown
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 });
    clock = 100;
    g.handleInput('up', 'Alex'); // cooldown écoulé pile
    expect(g.getState().character.pos).toEqual({ col: 3, row: 3 });
  });

  it('respecte un cooldown configuré à 5000 ms', () => {
    const g = createGame(config({ chaosCooldownMs: 5000 }), noRng, () => clock);
    g.reset();
    g.launch();
    g.handleInput('up', 'Alex'); // clock=0
    clock = 4999;
    g.handleInput('up', 'Alex');
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 });
    clock = 5000;
    g.handleInput('up', 'Alex');
    expect(g.getState().character.pos).toEqual({ col: 3, row: 3 });
  });
});

describe('createGame — mode Démocratie (J6)', () => {
  let clock: number;
  let game: GameEngine;

  function start(rng: () => number = noRng): void {
    clock = 0;
    game = createGame(config({ movementMode: 'democratie', democracyWindowMs: 300 }), rng, () => clock);
    game.reset();
    game.launch();
    game.tick(0); // résout la fenêtre vide initiale, ouvre la première vraie fenêtre (close à 300)
    game.drainEvents();
  }

  beforeEach(() => start());

  it('majorité simple exécutée à la fermeture de la fenêtre', () => {
    game.handleInput('up', 'A');
    game.handleInput('up', 'B');
    game.handleInput('up', 'C');
    game.handleInput('down', 'D');

    clock = 300;
    game.tick(clock); // ferme la fenêtre : up (3) > down (1)
    expect(game.getState().character.pos).toEqual({ col: 3, row: 4 });
  });

  it('la fenêtre ne se ferme pas avant son terme', () => {
    game.handleInput('up', 'A');
    clock = 299;
    game.tick(clock);
    expect(game.getState().character.pos).toEqual({ col: 3, row: 5 });
  });

  it('fenêtre vide : aucun vote, personnage immobile', () => {
    clock = 300;
    game.tick(clock);
    const events = game.drainEvents();
    expect(game.getState().character.pos).toEqual({ col: 3, row: 5 });
    expect(events.some((e) => e.type === 'character_moved')).toBe(false);
  });

  it('égalité : tirage au sort rng parmi les ex æquo', () => {
    start(fixedRng(0)); // tied = ['up', 'down'] (ordre fixe), floor(0*2) = 0 -> 'up'
    game.handleInput('up', 'A');
    game.handleInput('down', 'B');
    clock = 300;
    game.tick(clock);
    expect(game.getState().character.pos).toEqual({ col: 3, row: 4 }); // up

    start(fixedRng(0.99)); // floor(0.99*2) = 1 -> 'down'
    game.handleInput('up', 'A');
    game.handleInput('down', 'B');
    clock = 300;
    game.tick(clock);
    expect(game.getState().character.pos).toEqual({ col: 3, row: 5 }); // déjà en bas : immobile (mur)
  });

  it('vote gagnant vers un mur : compté mais personnage immobile', () => {
    game.handleInput('down', 'A'); // déjà sur la dernière ligne
    game.handleInput('down', 'B');
    clock = 300;
    game.tick(clock);
    const events = game.drainEvents();
    expect(game.getState().character.pos).toEqual({ col: 3, row: 5 });
    expect(events.some((e) => e.type === 'character_moved')).toBe(false);
  });

  it('chaque appui compte comme un vote, même vers un mur', () => {
    game.handleInput('down', 'A');
    game.handleInput('down', 'B');
    const events = game.drainEvents();
    expect(events.filter((e) => e.type === 'input_accepted')).toHaveLength(2);
  });

  it('la durée de fenêtre configurée à la dernière réinitialisation reste stable', () => {
    const g = createGame(config({ movementMode: 'democratie', democracyWindowMs: 1000 }), noRng, () => clock);
    clock = 0;
    g.reset();
    g.launch();
    g.tick(0); // ouvre la fenêtre, close à 1000
    g.handleInput('up', 'A');
    clock = 999;
    g.tick(clock);
    expect(g.getState().character.pos).toEqual({ col: 3, row: 5 }); // pas encore résolu
    clock = 1000;
    g.tick(clock);
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 }); // résolu pile à 1000
  });
});

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('createGame — fantômes : déplacement et recouvrement (J7, J8)', () => {
  let clock: number;

  beforeEach(() => {
    clock = 0;
  });

  it('traverse les quatre bords via le tore (J4)', () => {
    // rng: [spawn=pool[0], up, down, left, right] -> voir commentaires ci-dessous
    const rng = sequenceRng([0, 0, 0.26, 0.51, 0.76]);
    const game = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 1, ghostSpeed: 1 }), rng, () => clock);
    game.reset();
    // pool[0] = index 0 (zone de départ du perso loin du coin haut-gauche sur une grille 10x10)
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });
    game.launch();
    game.tick(0); // référence de temps
    game.drainEvents();

    clock = 1000; // vitesse 1 case/s -> une case franchie pile
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 9 }); // up, tore haut->bas

    clock = 2000;
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 }); // down, tore bas->haut

    clock = 3000;
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 9, row: 0 }); // left, tore gauche->droite

    clock = 4000;
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 }); // right, tore droite->gauche
  });

  it('recouvrement des cases quittées, sauf la case occupée par le personnage (J8)', () => {
    // Grille 3x3, torchRadius 1 : zone de départ = lignes 1 et 2 entières (6 cases),
    // ligne 0 reste masquée -> pool de spawn = ligne 0 (index 0,1,2).
    const rng = sequenceRng([0, 0.26, 0.76, 0.26, 0.76]);
    const game = createGame(
      config({ gridCols: 3, gridRows: 3, torchRadius: 1, ghostCount: 1, ghostSpeed: 1 }),
      rng,
      () => clock,
    );
    game.reset();
    expect(game.getState().character.pos).toEqual({ col: 1, row: 2 });
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });
    // sanity check des index de la zone de départ, déjà révélés
    expect(game.getState().revealed[3]).toBe(true); // (0,1)
    expect(game.getState().revealed[4]).toBe(true); // (1,1)
    expect(game.getState().revealed[5]).toBe(true); // (1,2) = case du personnage

    game.launch();
    game.tick(0);
    game.drainEvents();

    clock = 1000;
    game.tick(clock); // (0,0) -> (0,1) [down] ; départ (0,0) déjà masqué, rien à voir
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 1 });

    clock = 2000;
    game.tick(clock); // (0,1) -> (1,1) [right] ; départ (0,1) était révélé -> masqué
    expect(game.getState().ghosts[0].pos).toEqual({ col: 1, row: 1 });
    expect(game.getState().revealed[3]).toBe(false);

    clock = 3000;
    game.tick(clock); // (1,1) -> (1,2) [down] ; départ (1,1) était révélé -> masqué
    expect(game.getState().ghosts[0].pos).toEqual({ col: 1, row: 2 });
    expect(game.getState().revealed[4]).toBe(false);

    clock = 4000;
    game.tick(clock); // (1,2) -> (2,2) [right] ; départ (1,2) = case du personnage -> PAS masqué
    expect(game.getState().ghosts[0].pos).toEqual({ col: 2, row: 2 });
    expect(game.getState().revealed[5]).toBe(true);
  });

  it('vitesse 0.5 case/s : progression partielle avant la première case franchie', () => {
    const rng = sequenceRng([0, 0]);
    const game = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 1, ghostSpeed: 0.5 }), rng, () => clock);
    game.reset();
    game.launch();
    game.tick(0);
    game.drainEvents();

    clock = 1000; // progress += 0.5*(1000/1000) = 0.5
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });
    expect(game.getState().ghosts[0].moveProgress).toBeCloseTo(0.5);

    clock = 2000; // progress atteint 1.0 pile
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 9 });
    expect(game.getState().ghosts[0].moveProgress).toBeCloseTo(0);
  });

  it('vitesse 5 cases/s : peut franchir plusieurs cases en un seul intervalle', () => {
    const rng = sequenceRng([0, 0, 0.26, 0.51]);
    const game = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 1, ghostSpeed: 5 }), rng, () => clock);
    game.reset();
    game.launch();
    game.tick(0);
    game.drainEvents();

    clock = 400; // progress += 5*0.4 = 2.0 -> 2 cases franchies (up puis down, tore)
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });
  });

  it('0 fantôme : tableau vide, aucun rng consommé', () => {
    const game = createGame(config({ ghostCount: 0 }), noRng, () => clock);
    game.reset();
    expect(game.getState().ghosts).toEqual([]);
    game.launch();
    clock = 1000;
    game.tick(clock);
    expect(game.getState().ghosts).toEqual([]);
  });

  it('20 fantômes : tous initialisés et avancent chaque tick', () => {
    let seed = 1;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const game = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 20, ghostSpeed: 1 }), rng, () => clock);
    game.reset();
    expect(game.getState().ghosts).toHaveLength(20);
    game.launch();
    game.tick(0);
    game.drainEvents();

    clock = 1000;
    game.tick(clock);
    expect(game.drainEvents().filter((e) => e.type === 'ghost_moved')).toHaveLength(20);
  });
});
