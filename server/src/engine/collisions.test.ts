import { describe, expect, it } from 'vitest';
import { applyCollision, checkCollision } from './collisions.js';

describe('checkCollision', () => {
  it('vrai quand un fantôme occupe la case du personnage', () => {
    const character = { pos: { col: 2, row: 2 }, invincibleUntil: null, facing: 'down' as const };
    const ghosts = [
      { id: 0, pos: { col: 5, row: 5 }, target: null, moveProgress: 0 },
      { id: 1, pos: { col: 2, row: 2 }, target: null, moveProgress: 0 },
    ];
    expect(checkCollision(character, ghosts)).toBe(true);
  });

  it('faux si aucun fantôme ne partage la case', () => {
    const character = { pos: { col: 2, row: 2 }, invincibleUntil: null, facing: 'down' as const };
    const ghosts = [{ id: 0, pos: { col: 5, row: 5 }, target: null, moveProgress: 0 }];
    expect(checkCollision(character, ghosts)).toBe(false);
  });
});

describe('applyCollision', () => {
  const startPos = { col: 1, row: 1 };

  it('passif : aucun effet', () => {
    const character = { pos: { col: 5, row: 5 }, invincibleUntil: null, facing: 'down' as const };
    const revealed = [true, false, true];
    const outcome = applyCollision('passif', character, startPos, revealed, [0], 1000);

    expect(outcome).toEqual({ died: false, maskedIndices: [], revealedIndices: [] });
    expect(character.pos).toEqual({ col: 5, row: 5 });
    expect(character.invincibleUntil).toBeNull();
    expect(revealed).toEqual([true, false, true]);
  });

  it('mortel_reapparition : repositionne, invincibilité 2s, cases révélées conservées', () => {
    const character = { pos: { col: 5, row: 5 }, invincibleUntil: null, facing: 'down' as const };
    const revealed = [true, false, true];
    const outcome = applyCollision('mortel_reapparition', character, startPos, revealed, [0], 1000);

    expect(outcome.died).toBe(true);
    expect(outcome.maskedIndices).toEqual([]);
    expect(outcome.revealedIndices).toEqual([]);
    expect(character.pos).toEqual({ col: 1, row: 1 });
    expect(character.pos).not.toBe(startPos); // copie, pas la même référence
    expect(character.invincibleUntil).toBe(3000);
    expect(revealed).toEqual([true, false, true]); // inchangé
  });

  it('mortel_reinitialisation : brouillard à 100% puis re-révélation de la zone de départ', () => {
    const character = { pos: { col: 5, row: 5 }, invincibleUntil: null, facing: 'down' as const };
    const revealed = [true, true, false];
    const outcome = applyCollision('mortel_reinitialisation', character, startPos, revealed, [0], 1000);

    expect(outcome.died).toBe(true);
    expect(outcome.maskedIndices).toEqual([0, 1]); // seules les cases qui étaient vraies changent
    expect(outcome.revealedIndices).toEqual([0]); // puis re-révélée
    expect(revealed).toEqual([true, false, false]);
    expect(character.pos).toEqual({ col: 1, row: 1 });
    expect(character.invincibleUntil).toBe(3000);
  });
});
