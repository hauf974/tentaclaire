import { defaultGameConfig, type GameConfig } from '@tentaclaire/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, type GameEngine } from './game.js';
import { cellIndex } from './grid.js';

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

  it('setPlayerCount : passthrough pur reflété par getState()', () => {
    expect(game.getState().playerCount).toBe(0);
    game.setPlayerCount(12);
    expect(game.getState().playerCount).toBe(12);
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

  it("launch(config) depuis 'reset' adopte le nouveau config (C6, ex. Réinitialiser puis modifier puis Lancer sans re-réinitialiser)", () => {
    game.reset(config({ chaosCooldownMs: 500 }));
    game.launch(config({ chaosCooldownMs: 5000 }));
    game.handleInput('up', 'Alex');
    expect(game.getState().cooldownRemainingMs).toBeGreaterThan(4000);
  });

  it("launch(config) depuis 'paused' n'adopte PAS le nouveau config (ne perturbe pas une reprise en cours de partie)", () => {
    game.reset(config({ chaosCooldownMs: 500 }));
    game.launch();
    game.pause();
    game.launch(config({ chaosCooldownMs: 5000 }));
    game.handleInput('up', 'Alex');
    expect(game.getState().cooldownRemainingMs).toBeLessThanOrEqual(500);
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

  it('défaite pile à 0 : le plateau reste figé tel quel (rien de recouvert), phase figée', () => {
    const g = createGame(config({ timerSeconds: 1 }), noRng, () => clock);
    g.reset();
    g.launch();
    clock = 1000;
    g.tick(clock); // référence initiale
    g.handleInput('up', 'Alex'); // révèle au moins une case de plus que la zone de départ
    g.drainEvents(); // vide le buffer (character_moved/revealed_changed de ce déplacement)

    const revealedBeforeDefeat = [...g.getState().revealed];
    expect(revealedBeforeDefeat.some(Boolean)).toBe(true); // au moins une case révélée à figer
    expect(revealedBeforeDefeat.every(Boolean)).toBe(false); // pas toute la grille non plus (cas dégénéré)

    clock = 1500;
    g.tick(clock);
    expect(g.getState().timerRemainingMs).toBe(500);
    expect(g.getState().phase).toBe('running');
    expect(g.getState().revealed).toEqual(revealedBeforeDefeat); // toujours inchangé pendant que ça tourne

    clock = 2000;
    g.tick(clock);
    expect(g.getState().timerRemainingMs).toBe(0);
    expect(g.getState().phase).toBe('defeat');
    // Ni recouvert (cases révélées avant la défaite toujours révélées), ni
    // révélé en plus (cases dans le brouillard avant restent dans le brouillard) :
    // le plateau au moment de la défaite est identique à juste avant.
    expect(g.getState().revealed).toEqual(revealedBeforeDefeat);
    const eventsAtDefeat = g.drainEvents().map((e) => e.type);
    expect(eventsAtDefeat).toContain('defeat');
    // Aucun `revealed_changed` émis par la défaite elle-même : rien n'a changé.
    expect(eventsAtDefeat).not.toContain('revealed_changed');

    // la partie reste figée après la défaite, même avec un nouveau tick
    clock = 5000;
    g.tick(clock);
    expect(g.getState().timerRemainingMs).toBe(0);
    expect(g.getState().phase).toBe('defeat');
    expect(g.getState().revealed).toEqual(revealedBeforeDefeat);
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

describe('createGame — updateConfig (pilotage à chaud, sans reset/launch)', () => {
  let clock: number;

  beforeEach(() => {
    clock = 0;
  });

  it('movementMode chaos -> démocratie : le prochain handleInput vote au lieu de bouger', () => {
    const g = createGame(config({ movementMode: 'chaos', chaosCooldownMs: 100 }), noRng, () => clock);
    g.reset();
    g.launch();
    g.handleInput('up', 'Alex'); // encore en chaos : déplacement immédiat
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 });
    g.drainEvents();

    g.updateConfig({ movementMode: 'democratie' });
    g.handleInput('up', 'Alex'); // désormais un simple vote, pas un déplacement
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 });
    expect(g.getState().cooldownRemainingMs).toBe(0); // plus en mode chaos
  });

  it('movementMode démocratie -> chaos : le prochain handleInput bouge immédiatement', () => {
    const g = createGame(config({ movementMode: 'democratie', democracyWindowMs: 300 }), noRng, () => clock);
    g.reset();
    g.launch();
    g.tick(0); // ouvre la première fenêtre
    g.drainEvents();

    g.updateConfig({ movementMode: 'chaos', chaosCooldownMs: 100 });
    g.handleInput('up', 'Alex');
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 }); // déplacement immédiat, plus de fenêtre à attendre
  });

  it("chaosCooldownMs modifié en cours de cooldown ne raccourcit pas le cooldown déjà engagé, s'applique au suivant", () => {
    const g = createGame(config({ chaosCooldownMs: 1000 }), noRng, () => clock);
    g.reset();
    g.launch();
    g.handleInput('up', 'Alex'); // clock=0 -> bouge, cooldownUntil=1000 (ancienne valeur)

    g.updateConfig({ chaosCooldownMs: 100 });
    clock = 150;
    g.handleInput('up', 'Alex'); // toujours dans l'ancien cooldown (jusqu'à 1000) -> ignoré
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 });

    clock = 1000;
    g.handleInput('up', 'Alex'); // ancien cooldown écoulé -> bouge, nouveau cooldown = 100 ms
    expect(g.getState().character.pos).toEqual({ col: 3, row: 3 });

    clock = 1099;
    g.handleInput('up', 'Alex'); // dans le nouveau cooldown -> ignoré
    expect(g.getState().character.pos).toEqual({ col: 3, row: 3 });

    clock = 1100;
    g.handleInput('up', 'Alex'); // nouveau cooldown écoulé -> bouge
    expect(g.getState().character.pos).toEqual({ col: 3, row: 2 });
  });

  it("democracyWindowMs modifié en cours de fenêtre ne raccourcit pas la fenêtre déjà ouverte, s'applique à la suivante", () => {
    const g = createGame(config({ movementMode: 'democratie', democracyWindowMs: 1000 }), noRng, () => clock);
    g.reset();
    g.launch();
    g.tick(0); // ouvre la fenêtre (ferme à 1000, ancienne durée)
    g.drainEvents();

    g.updateConfig({ democracyWindowMs: 100 });
    g.handleInput('up', 'Alex');
    clock = 999;
    g.tick(clock); // fenêtre encore ouverte (ancienne durée 1000)
    expect(g.getState().character.pos).toEqual({ col: 3, row: 5 });

    clock = 1000;
    g.tick(clock); // ferme l'ancienne fenêtre (up gagne), ouvre la nouvelle avec la durée mise à jour (close à 1100)
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 });

    g.handleInput('down', 'Bob');
    clock = 1099;
    g.tick(clock); // nouvelle fenêtre (100 ms) pas encore fermée
    expect(g.getState().character.pos).toEqual({ col: 3, row: 4 });

    clock = 1100;
    g.tick(clock); // fermée -> down gagne
    expect(g.getState().character.pos).toEqual({ col: 3, row: 5 });
  });

  it('ghostSpeed modifié en cours de partie est pris en compte dès le tick suivant', () => {
    const rng = sequenceRng([0, 0, 0.26]);
    const g = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 1, ghostSpeed: 1 }), rng, () => clock);
    g.reset();
    g.launch();
    g.tick(0);
    g.drainEvents();

    g.updateConfig({ ghostSpeed: 5 }); // au lieu de 1 : franchit une case entière en 200 ms au lieu de 5x plus lentement
    clock = 200;
    g.tick(clock);
    expect(g.getState().ghosts[0].moveProgress).toBeCloseTo(0); // une case pile franchie
  });

  it("ghostBehavior modifié en cours de partie s'applique au prochain re-ciblage (aleatoire -> extinction)", () => {
    // Grille 5x5, torchRadius 0 : départ (2,4). rng : [0 -> spawn en (0,0) ;
    // 0 -> cible initiale 'aleatoire' = up -> (0,4) ; 0 -> tirage 80/20 du
    // RE-ciblage après bascule en 'extinction' (tente la branche extinction) ;
    // 0.51 -> repli (seule case révélée = zone de départ, exclue) -> 'left'.
    const rng = sequenceRng([0, 0, 0, 0.51]);
    const g = createGame(
      config({ gridCols: 5, gridRows: 5, torchRadius: 0, ghostCount: 1, ghostSpeed: 1, ghostBehavior: 'aleatoire' }),
      rng,
      () => clock,
    );
    g.reset();
    expect(g.getState().ghosts[0]).toMatchObject({ pos: { col: 0, row: 0 }, target: { col: 0, row: 4 } });
    g.launch();
    g.tick(0);
    g.drainEvents();

    g.updateConfig({ ghostBehavior: 'extinction' });
    clock = 1000; // franchit la case -> pos = (0,4) -> re-ciblage, désormais en 'extinction'
    g.tick(clock);
    // Repli 'extinction' (pas 'aleatoire', qui n'aurait consommé qu'un seul
    // tirage rng et donné 'up' -> (0,3)) : deux tirages, direction 'left'.
    expect(g.getState().ghosts[0]).toMatchObject({ pos: { col: 0, row: 4 }, target: { col: 4, row: 4 } });
  });

  it('updateConfig fonctionne même avant tout reset (phase idle)', () => {
    const rng = sequenceRng([0, 0]);
    const g = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 0 }), rng, () => clock);
    expect(g.getState().phase).toBe('idle');
    expect(g.getState().ghosts).toEqual([]);

    g.updateConfig({ ghostCount: 1 });
    expect(g.getState().ghosts).toHaveLength(1);
  });

  it('ghostCount augmenté en cours de partie ajoute des fantômes sans toucher aux existants', () => {
    const rng = sequenceRng([0, 0.1, 0.2, 0.9]);
    const g = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 2 }), rng, () => clock);
    g.reset();
    g.launch();
    const before = g.getState().ghosts;
    expect(before).toHaveLength(2);
    const beforeIds = before.map((gh) => gh.id);

    g.updateConfig({ ghostCount: 5 });
    const after = g.getState().ghosts;
    expect(after).toHaveLength(5);
    expect(after.slice(0, 2)).toEqual(before); // les fantômes déjà en jeu ne sont pas touchés
    const newIds = after.slice(2).map((gh) => gh.id);
    expect(new Set([...beforeIds, ...newIds]).size).toBe(5); // aucun id en double
    expect(Math.min(...newIds)).toBeGreaterThan(Math.max(...beforeIds)); // ids décalés après les existants
  });

  it('ghostCount réduit en cours de partie retire les derniers fantômes, sans toucher les autres', () => {
    let seed = 1;
    const rng = (): number => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const g = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 5 }), rng, () => clock);
    g.reset();
    g.launch();
    expect(g.getState().ghosts).toHaveLength(5);
    const firstTwo = g.getState().ghosts.slice(0, 2);

    g.updateConfig({ ghostCount: 2 });
    expect(g.getState().ghosts).toEqual(firstTwo);
  });

  it('ghostCount ramené à 0 vide le tableau de fantômes', () => {
    const rng = sequenceRng([0, 0]);
    const g = createGame(config({ gridCols: 10, gridRows: 10, ghostCount: 1 }), rng, () => clock);
    g.reset();
    g.launch();
    expect(g.getState().ghosts).toHaveLength(1);

    g.updateConfig({ ghostCount: 0 });
    expect(g.getState().ghosts).toEqual([]);
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

describe('createGame — IA extinction des feux (R1, ticket 8.1)', () => {
  let clock: number;

  beforeEach(() => {
    clock = 0;
  });

  it("la zone de départ (révélée d'office) n'attire jamais un fantôme extinction : repli aléatoire tant que rien d'autre n'est exploré", () => {
    // Grille 5x5, torchRadius 0 : départ (2,4), seule case révélée = 22 (la case du
    // personnage). rng: [0 -> spawn en (0,0) ; 0 -> tirage 80/20 (tente la branche
    // extinction) ; 0.51 -> repli, la seule case révélée (22) étant exclue comme
    // zone de départ, aucune candidate ne subsiste].
    const rng = sequenceRng([0, 0, 0.51]);
    const game = createGame(
      config({ gridCols: 5, gridRows: 5, torchRadius: 0, ghostCount: 1, ghostSpeed: 1, ghostBehavior: 'extinction' }),
      rng,
      () => clock,
    );
    game.reset();
    expect(game.getState().character.pos).toEqual({ col: 2, row: 4 });
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });

    game.launch();
    game.tick(0);
    game.drainEvents();

    // Si la zone de départ attirait le fantôme, la cible serait (1,0) (direction
    // 'right', la plus courte vers la case 22) au lieu du repli 'left' -> (4,0).
    clock = 1000;
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 4, row: 0 });
  });

  it('un fantôme converge vers une case explorée hors de la zone de départ (branchement de bout en bout)', () => {
    // La mécanique fine (départage, tore, exclusion) est couverte exhaustivement
    // au niveau chooseNextTarget (server/src/engine/ghosts.test.ts) ; ce test
    // vérifie seulement que game.ts branche bien `startZoneIndices` de bout en
    // bout : après une exploration du personnage, une case nouvellement révélée
    // hors zone de départ redevient une cible valide et attire le fantôme.
    const rng = sequenceRng([0]); // toujours < 0.8 (branche extinction) ; jamais de repli dans ce test
    const game = createGame(
      config({ gridCols: 5, gridRows: 5, torchRadius: 0, ghostCount: 1, ghostSpeed: 1, ghostBehavior: 'extinction' }),
      rng,
      () => clock,
    );
    game.reset();
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });
    // Repli initial (seule la zone de départ, exclue, est révélée) : direction 'up' (rng=0 partout).
    expect(game.getState().ghosts[0].target).toEqual({ col: 0, row: 4 });

    game.launch();
    game.tick(0);
    game.drainEvents();

    // Le personnage explore : (2,4) -> (2,3), révèle la case 17, hors zone de départ (22).
    clock = 500;
    game.handleInput('up', 'A');
    expect(game.getState().revealed[cellIndex(2, 3, 5)]).toBe(true);

    // (0,0) -> (0,4) [repli déjà ciblé] ; (2,3) est maintenant l'unique candidate
    // hors zone de départ -> re-ciblage 'right' vers (1,4), qui s'en rapproche.
    clock = 1000;
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 4 });
    expect(game.getState().ghosts[0].target).toEqual({ col: 1, row: 4 });

    // (0,4) -> (1,4) ; re-ciblage 'up' vers (1,3), encore plus proche de (2,3).
    clock = 2000;
    game.tick(clock);
    expect(game.getState().ghosts[0].pos).toEqual({ col: 1, row: 4 });
    expect(game.getState().ghosts[0].target).toEqual({ col: 1, row: 3 });
  });
});

describe('createGame — point de départ configurable (R3, ticket 8.3)', () => {
  let clock: number;

  beforeEach(() => {
    clock = 0;
  });

  it('position fixe non-défaut : zone de torche révélée au départ configuré, respawn au même endroit', () => {
    // Grille 3x3, départ 'top-right' -> (2,0). Fantôme figé en (0,0) (vitesse
    // 0,5, jamais de tick à élapsé non nul, cf. setupCollisionScenario ci-dessous).
    const rng = sequenceRng([0]);
    const game = createGame(
      config({
        gridCols: 3,
        gridRows: 3,
        torchRadius: 0,
        ghostCount: 1,
        ghostSpeed: 0.5,
        collisionMode: 'mortel_reapparition',
        startPosition: 'top-right',
      }),
      rng,
      () => clock,
    );
    game.reset();
    expect(game.getState().character.pos).toEqual({ col: 2, row: 0 });
    expect(game.getState().revealed[cellIndex(2, 0, 3)]).toBe(true); // zone de torche autour du départ configuré
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });

    game.launch();
    game.tick(0);
    game.drainEvents();

    clock = 500;
    game.handleInput('left', 'A'); // (2,0) -> (1,0)
    clock = 1000;
    game.handleInput('left', 'A'); // (1,0) -> (0,0) = collision avec le fantôme
    const events = game.drainEvents();

    expect(events.filter((e) => e.type === 'character_died')).toHaveLength(1);
    expect(game.getState().character.pos).toEqual({ col: 2, row: 0 }); // respawn à la position configurée
  });

  it('"random" : position tirée au lancement, respawn vers cette même case (pas de second tirage)', () => {
    // Construction avec la config par défaut (startPosition 'bottom-center',
    // fixe -> 0 appel rng) ; reset(newConfig) est le point où R3 s'applique
    // réellement (C6), comme le fait la route admin /api/admin/game/reset.
    const rng = sequenceRng([0.5, 0, 0]);
    const game = createGame(config(), rng, () => clock);
    // rng: [0.5 -> tirage uniforme sur les 25 cases de la grille 5x5 :
    // floor(0.5*25)=12 -> (col:2, row:2), avant tout le reste ; 0 -> spawn du
    // fantôme (pool hors de cette zone de départ) ; 0 -> cible initiale du fantôme]
    game.reset(
      config({
        gridCols: 5,
        gridRows: 5,
        torchRadius: 0,
        ghostCount: 1,
        ghostSpeed: 0.5,
        collisionMode: 'mortel_reapparition',
        startPosition: 'random',
      }),
    );
    expect(game.getState().character.pos).toEqual({ col: 2, row: 2 }); // case 12/25 tirée sur la grille 5x5 (pas une des 9 positions fixes)
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 }); // spawn hors de la zone de départ tirée

    game.launch();
    game.tick(0);
    game.drainEvents();

    clock = 500;
    game.handleInput('left', 'A'); // (2,2) -> (1,2)
    clock = 1000;
    game.handleInput('left', 'A'); // (1,2) -> (0,2)
    clock = 1500;
    game.handleInput('up', 'A'); // (0,2) -> (0,1)
    clock = 2000;
    game.handleInput('up', 'A'); // (0,1) -> (0,0) = collision avec le fantôme
    const events = game.drainEvents();

    expect(events.filter((e) => e.type === 'character_died')).toHaveLength(1);
    expect(game.getState().character.pos).toEqual({ col: 2, row: 2 }); // respawn vers la même case tirée, pas un nouveau tirage
  });

  it('"random" : le tirage est consommé pendant reset(), avant tout autre appel rng (0 fantôme)', () => {
    let calls = 0;
    const rng = () => {
      calls++;
      return 0; // -> première case de la grille, (col:0, row:0)
    };
    const game = createGame(config({ ghostCount: 0, startPosition: 'random' }), rng, () => clock);

    calls = 0; // ne compter que les appels de reset() (la construction initiale utilise la config par défaut, fixe)
    game.reset();
    expect(calls).toBe(1); // aucun fantôme à spawner : seul le tirage de la position consomme le rng
    expect(game.getState().character.pos).toEqual({ col: 0, row: 0 }); // (0,0) sur la grille 6x6 par défaut du helper config()
  });
});

describe('createGame — collisions et invincibilité (J10, J11)', () => {
  let clock: number;

  beforeEach(() => {
    clock = 0;
  });

  /**
   * Grille 3x3, torchRadius 0, 1 fantôme figé en (0,0) (jamais de tick() à
   * élapsé non nul, donc moveProgress reste à 0). Le personnage part de (1,2)
   * et rejoint (0,0) via 3 déplacements chaos entièrement déterministes
   * (aucun rng nécessaire côté personnage), ce qui provoque la collision.
   */
  function setupCollisionScenario(collisionMode: GameConfig['collisionMode']) {
    const rng = sequenceRng([0]); // spawn du fantôme en (0,0) ; cible initiale jamais atteinte
    const game = createGame(
      config({ gridCols: 3, gridRows: 3, torchRadius: 0, ghostCount: 1, ghostSpeed: 0.5, collisionMode }),
      rng,
      () => clock,
    );
    game.reset();
    expect(game.getState().ghosts[0].pos).toEqual({ col: 0, row: 0 });
    game.launch();
    game.tick(0); // référence de temps, n'avance pas le fantôme (elapsed=0)
    game.drainEvents();

    clock = 500;
    game.handleInput('up', 'A'); // (1,2) -> (1,1)
    clock = 1000;
    game.handleInput('up', 'A'); // (1,1) -> (1,0)
    clock = 1500;
    game.handleInput('left', 'A'); // (1,0) -> (0,0) = collision avec le fantôme
    return game;
  }

  it('passif : aucun effet', () => {
    const game = setupCollisionScenario('passif');
    const events = game.drainEvents();

    expect(game.getState().character.pos).toEqual({ col: 0, row: 0 });
    expect(game.getState().character.invincibleUntil).toBeNull();
    expect(game.getState().phase).toBe('running');
    expect(events.some((e) => e.type === 'character_died')).toBe(false);
  });

  it('mortel_reapparition : repositionne au départ, cases révélées conservées, invincibilité 2s', () => {
    const game = setupCollisionScenario('mortel_reapparition');
    const events = game.drainEvents();

    expect(game.getState().character.pos).toEqual({ col: 1, row: 2 }); // retour au départ
    expect(game.getState().character.invincibleUntil).toBe(1500 + 2000);
    expect(events.filter((e) => e.type === 'character_died')).toHaveLength(1);
    // cases traversées pendant la fuite : toutes encore révélées (rien n'est remis à zéro)
    expect(game.getState().revealed[cellIndex(0, 0, 3)]).toBe(true);
    expect(game.getState().revealed[cellIndex(1, 0, 3)]).toBe(true);
    expect(game.getState().revealed[cellIndex(1, 1, 3)]).toBe(true);
    expect(game.getState().revealed[cellIndex(1, 2, 3)]).toBe(true); // départ

    // collisions ignorées pendant l'invincibilité : re-rejoindre (0,0) ne tue pas une 2e fois
    // (clock >= 2000 pour respecter le cooldown chaos de 500ms depuis le dernier déplacement à 1500)
    clock = 2000;
    game.handleInput('up', 'A'); // (1,2) -> (1,1)
    clock = 2500;
    game.handleInput('up', 'A'); // (1,1) -> (1,0)
    clock = 3000;
    game.handleInput('left', 'A'); // (1,0) -> (0,0) = même case que le fantôme, mais invincible jusqu'à 3500
    const secondEvents = game.drainEvents();

    expect(game.getState().character.pos).toEqual({ col: 0, row: 0 }); // pas de rebond : la collision est ignorée
    expect(secondEvents.some((e) => e.type === 'character_died')).toBe(false); // pas de 2e mort (pas de boucle de mort)
  });

  it('mortel_reinitialisation : repositionne au départ, brouillard à 100% sauf la zone de départ', () => {
    const game = setupCollisionScenario('mortel_reinitialisation');
    const events = game.drainEvents();

    expect(game.getState().character.pos).toEqual({ col: 1, row: 2 });
    expect(game.getState().character.invincibleUntil).toBe(1500 + 2000);
    expect(events.filter((e) => e.type === 'character_died')).toHaveLength(1);
    // brouillard remis à 100%, sauf la zone de départ re-révélée
    expect(game.getState().revealed[cellIndex(0, 0, 3)]).toBe(false);
    expect(game.getState().revealed[cellIndex(1, 0, 3)]).toBe(false);
    expect(game.getState().revealed[cellIndex(1, 1, 3)]).toBe(false);
    expect(game.getState().revealed[cellIndex(1, 2, 3)]).toBe(true); // départ, re-révélée
  });

  it("l'invincibilité expire après 2s : un tick au-delà remet invincibleUntil à null", () => {
    const game = setupCollisionScenario('mortel_reapparition');
    expect(game.getState().character.invincibleUntil).toBe(1500 + 2000);

    clock = 3499;
    game.tick(clock); // juste avant l'expiration
    expect(game.getState().character.invincibleUntil).toBe(3500);

    clock = 3500;
    game.tick(clock); // expiration pile
    expect(game.getState().character.invincibleUntil).toBeNull();
  });
});
