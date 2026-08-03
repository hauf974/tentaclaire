import { defaultGameConfig, type GameConfig } from '@tentaclaire/shared';
import { describe, expect, it } from 'vitest';
import { createGame } from './game.js';

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...defaultGameConfig, gridCols: 5, gridRows: 5, ghostCount: 0, ...overrides };
}

/**
 * Scénarios scriptés bout en bout, moteur seul (aucune dépendance réseau) :
 * une petite grille sans fantômes menée jusqu'à la victoire, puis une partie
 * avec fantômes menée jusqu'à la défaite (timer épuisé). Démontre que les
 * modules (grille, déplacement, fantômes, timer, phases) fonctionnent
 * ensemble, pas seulement isolément.
 */
describe('createGame — intégration bout en bout', () => {
  it('petite grille sans fantômes, chaos, jusqu\'à la victoire (J12)', () => {
    let clock = 0;
    const game = createGame(
      config({ torchRadius: 2, chaosCooldownMs: 100 }),
      () => {
        throw new Error('rng ne devrait pas être appelé (aucun fantôme)');
      },
      () => clock,
    );

    game.reset();
    expect(game.getState().phase).toBe('reset');
    game.launch();
    expect(game.getState().phase).toBe('running');

    // Départ (2,4), torchRadius 2 : révèle rows 2-4 (15/25 cases).
    expect(game.getState().revealed.filter(Boolean)).toHaveLength(15);

    clock = 100;
    game.handleInput('up', 'Alex'); // (2,4) -> (2,3) : révèle row 1 en plus (20/25)
    expect(game.getState().character.pos).toEqual({ col: 2, row: 3 });
    expect(game.getState().phase).toBe('running');
    expect(game.getState().revealed.filter(Boolean)).toHaveLength(20);

    clock = 200;
    game.handleInput('up', 'Alex'); // (2,3) -> (2,2) : révèle row 0, grille 100% -> victoire
    expect(game.getState().character.pos).toEqual({ col: 2, row: 2 });
    expect(game.getState().phase).toBe('victory');
    expect(game.getState().revealed.every(Boolean)).toBe(true);
    expect(game.drainEvents().some((e) => e.type === 'victory')).toBe(true);

    // Tout est figé : ni le timer ni les inputs ne font plus rien.
    const timerAtVictory = game.getState().timerRemainingMs;
    clock = 100000;
    game.tick(clock);
    expect(game.getState().timerRemainingMs).toBe(timerAtVictory);
    game.handleInput('down', 'Alex');
    expect(game.getState().character.pos).toEqual({ col: 2, row: 2 });
    expect(game.getState().phase).toBe('victory');
  });

  it('petite grille avec fantômes, jusqu\'à la défaite par timer (J13)', () => {
    let clock = 0;
    let seed = 7;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const game = createGame(config({ timerSeconds: 1, ghostCount: 3, ghostSpeed: 1 }), rng, () => clock);

    game.reset();
    expect(game.getState().ghosts).toHaveLength(3);
    game.launch();
    game.tick(0); // référence de temps
    game.drainEvents();
    expect(game.getState().phase).toBe('running');

    // Le temps passe, les fantômes se déplacent, rien ne doit planter.
    clock = 500;
    game.tick(clock);
    expect(game.getState().phase).toBe('running');
    expect(game.getState().timerRemainingMs).toBe(500);

    clock = 1000;
    game.tick(clock); // timer à 0 -> défaite
    expect(game.getState().phase).toBe('defeat');
    expect(game.getState().timerRemainingMs).toBe(0);
    expect(game.getState().revealed.every((cell) => cell === false)).toBe(true);
    expect(game.drainEvents().some((e) => e.type === 'defeat')).toBe(true);

    // Figé après la défaite.
    clock = 5000;
    game.tick(clock);
    expect(game.getState().phase).toBe('defeat');
  });
});
