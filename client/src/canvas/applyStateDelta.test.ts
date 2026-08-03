import type { GameState } from '@tentaclaire/shared';
import { describe, expect, it } from 'vitest';
import { applyStateDelta } from './applyStateDelta.js';

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

describe('applyStateDelta', () => {
  it('ne mute pas l\'état courant', () => {
    const current = state();
    const result = applyStateDelta(current, { phase: 'paused' });
    expect(current.phase).toBe('running');
    expect(result.phase).toBe('paused');
    expect(result).not.toBe(current);
  });

  it('applique un changement de phase', () => {
    const result = applyStateDelta(state(), { phase: 'victory' });
    expect(result.phase).toBe('victory');
  });

  it('applique un changement de personnage', () => {
    const character = { pos: { col: 1, row: 1 }, invincibleUntil: 1000, facing: 'up' as const };
    const result = applyStateDelta(state(), { character });
    expect(result.character).toEqual(character);
  });

  it('applique un changement de fantômes', () => {
    const ghosts = [{ id: 0, pos: { col: 0, row: 0 }, target: { col: 1, row: 0 }, moveProgress: 0.5 }];
    const result = applyStateDelta(state(), { ghosts });
    expect(result.ghosts).toEqual(ghosts);
  });

  it('applique revealedChanges en copiant le tableau', () => {
    const current = state();
    const result = applyStateDelta(current, {
      revealedChanges: [
        { index: 1, revealed: true },
        { index: 0, revealed: false },
      ],
    });
    expect(result.revealed).toEqual([false, true, false, false]);
    expect(current.revealed).toEqual([true, false, false, false]); // inchangé
  });

  it('laisse les champs absents du delta inchangés', () => {
    const current = state();
    const result = applyStateDelta(current, { timerRemainingMs: 59000 });
    expect(result.phase).toBe(current.phase);
    expect(result.character).toBe(current.character);
    expect(result.ghosts).toBe(current.ghosts);
    expect(result.revealed).toBe(current.revealed);
    expect(result.timerRemainingMs).toBe(59000);
  });

  it('applique plusieurs champs simultanément', () => {
    const result = applyStateDelta(state(), { phase: 'paused', playerCount: 5, cooldownRemainingMs: 200 });
    expect(result.phase).toBe('paused');
    expect(result.playerCount).toBe(5);
    expect(result.cooldownRemainingMs).toBe(200);
  });
});
