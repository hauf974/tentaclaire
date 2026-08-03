import type { GameState } from '@tentaclaire/shared';
import { describe, expect, it } from 'vitest';
import { cloneGameState, computeStateDelta } from './realtime.js';

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'running',
    cols: 2,
    rows: 2,
    revealed: [true, false, false, false],
    character: { pos: { col: 0, row: 0 }, invincibleUntil: null, facing: 'down' },
    ghosts: [],
    timerRemainingMs: 60000,
    playerCount: 0,
    cooldownRemainingMs: 0,
    ...overrides,
  };
}

describe('computeStateDelta', () => {
  it('prev=null : delta complet (première diffusion)', () => {
    const delta = computeStateDelta(null, state());
    expect(delta).not.toBeNull();
    expect(delta?.phase).toBe('running');
    expect(delta?.character).toEqual(state().character);
    expect(delta?.ghosts).toEqual([]);
    expect(delta?.timerRemainingMs).toBe(60000);
    expect(delta?.playerCount).toBe(0);
    expect(delta?.cooldownRemainingMs).toBe(0);
    // prev=null : toutes les cases sont rapportées (pas de référence pour diffuser un delta partiel)
    expect(delta?.revealedChanges).toHaveLength(4);
    expect(delta?.revealedChanges).toContainEqual({ index: 0, revealed: true });
    expect(delta?.revealedChanges).toContainEqual({ index: 1, revealed: false });
  });

  it('état strictement identique : aucun delta', () => {
    const s = state();
    expect(computeStateDelta(s, state())).toBeNull();
  });

  it('seule la phase change', () => {
    const prev = state();
    const delta = computeStateDelta(prev, state({ phase: 'paused' }));
    expect(delta).toEqual({ phase: 'paused' });
  });

  it('seul le timer change', () => {
    const prev = state();
    const delta = computeStateDelta(prev, state({ timerRemainingMs: 59900 }));
    expect(delta).toEqual({ timerRemainingMs: 59900 });
  });

  it('seule une case de revealed change', () => {
    const prev = state();
    const curr = state({ revealed: [true, true, false, false] });
    const delta = computeStateDelta(prev, curr);
    expect(delta).toEqual({ revealedChanges: [{ index: 1, revealed: true }] });
  });

  it('le personnage bouge', () => {
    const prev = state();
    const curr = state({ character: { pos: { col: 1, row: 0 }, invincibleUntil: null, facing: 'right' } });
    const delta = computeStateDelta(prev, curr);
    expect(delta).toEqual({ character: curr.character });
  });

  it('les fantômes bougent', () => {
    const prev = state({ ghosts: [{ id: 0, pos: { col: 0, row: 0 }, target: { col: 1, row: 0 }, moveProgress: 0.2 }] });
    const curr = state({ ghosts: [{ id: 0, pos: { col: 0, row: 0 }, target: { col: 1, row: 0 }, moveProgress: 0.4 }] });
    const delta = computeStateDelta(prev, curr);
    expect(delta).toEqual({ ghosts: curr.ghosts });
  });

  it('plusieurs champs changent simultanément', () => {
    const prev = state();
    const curr = state({ phase: 'paused', timerRemainingMs: 59900, playerCount: 3 });
    const delta = computeStateDelta(prev, curr);
    expect(delta).toEqual({ phase: 'paused', timerRemainingMs: 59900, playerCount: 3 });
  });
});

describe('cloneGameState', () => {
  it('produit un instantané indépendant : muter la source ne modifie pas le clone', () => {
    const original = state({
      ghosts: [{ id: 0, pos: { col: 1, row: 1 }, target: { col: 2, row: 1 }, moveProgress: 0.3 }],
    });
    const snapshot = cloneGameState(original);

    original.character.pos.col = 99;
    original.revealed[0] = false;
    original.ghosts[0].pos.col = 99;
    original.ghosts.push({ id: 1, pos: { col: 0, row: 0 }, target: null, moveProgress: 0 });

    expect(snapshot.character.pos.col).toBe(0);
    expect(snapshot.revealed[0]).toBe(true);
    expect(snapshot.ghosts).toHaveLength(1);
    expect(snapshot.ghosts[0].pos.col).toBe(1);
  });

  it('deux instantanés successifs du même état muté restent comparables (base du diff)', () => {
    // Simule ce qui se passerait sans clone : si on stockait la référence live,
    // `prev` et `curr` finiraient identiques après mutation -> plus aucun delta détecté.
    const live = state();
    const snapshot1 = cloneGameState(live);
    live.timerRemainingMs = 59000; // mutation "en place", comme le ferait le moteur
    const snapshot2 = cloneGameState(live);

    expect(computeStateDelta(snapshot1, snapshot2)).toEqual({ timerRemainingMs: 59000 });
  });
});
