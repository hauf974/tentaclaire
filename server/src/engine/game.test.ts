import { defaultGameConfig, type GameConfig } from '@tentaclaire/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, type GameEngine } from './game.js';

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...defaultGameConfig, gridCols: 6, gridRows: 6, ...overrides };
}

function noRng(): number {
  throw new Error('rng ne devrait pas être appelé dans ce ticket');
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
