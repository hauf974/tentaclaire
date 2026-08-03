import type { CharacterState } from '@tentaclaire/shared';
import { describe, expect, it } from 'vitest';
import { createCharacterAnimator, isCharacterVisible, victoryBounceOffset } from './characterAnimator.js';

function character(overrides: Partial<CharacterState> = {}): CharacterState {
  return { pos: { col: 0, row: 0 }, invincibleUntil: null, facing: 'down', ...overrides };
}

describe('createCharacterAnimator', () => {
  it('premier état connu : snap immédiat, pas d\'animation', () => {
    const animator = createCharacterAnimator();
    animator.setCharacter(character({ pos: { col: 3, row: 4 } }));
    expect(animator.getVisualPos()).toEqual({ col: 3, row: 4 });
  });

  it('un changement de position anime sur ~150 ms', () => {
    const animator = createCharacterAnimator();
    animator.setCharacter(character({ pos: { col: 0, row: 0 } }));
    animator.setCharacter(character({ pos: { col: 1, row: 0 } }));

    animator.tick(75);
    expect(animator.getVisualPos().col).toBeCloseTo(0.5, 5);

    animator.tick(75);
    expect(animator.getVisualPos().col).toBeCloseTo(1, 5);
  });

  it('ne dépasse jamais la position cible (clamp)', () => {
    const animator = createCharacterAnimator();
    animator.setCharacter(character({ pos: { col: 0, row: 0 } }));
    animator.setCharacter(character({ pos: { col: 2, row: 0 } }));
    animator.tick(1000); // bien plus que 150ms
    expect(animator.getVisualPos()).toEqual({ col: 2, row: 0 });
  });

  it('une répétition de la même position ne redémarre pas d\'animation', () => {
    const animator = createCharacterAnimator();
    animator.setCharacter(character({ pos: { col: 2, row: 2 } }));
    animator.tick(1000);
    animator.setCharacter(character({ pos: { col: 2, row: 2 } })); // même position
    expect(animator.getVisualPos()).toEqual({ col: 2, row: 2 });
  });

  it('un nouveau déplacement pendant une animation repart de la position visuelle courante', () => {
    const animator = createCharacterAnimator();
    animator.setCharacter(character({ pos: { col: 0, row: 0 } }));
    animator.setCharacter(character({ pos: { col: 2, row: 0 } }));
    animator.tick(75); // à mi-chemin : col = 1
    animator.setCharacter(character({ pos: { col: 5, row: 0 } })); // nouveau déplacement
    expect(animator.getVisualPos().col).toBeCloseTo(1, 5); // pas de saut
    animator.tick(150);
    expect(animator.getVisualPos().col).toBeCloseTo(5, 5);
  });

  it('expose le facing courant', () => {
    const animator = createCharacterAnimator();
    animator.setCharacter(character({ facing: 'left' }));
    expect(animator.getFacing()).toBe('left');
  });
});

describe('isCharacterVisible', () => {
  it('toujours visible hors invincibilité', () => {
    expect(isCharacterVisible(null, 1000)).toBe(true);
  });

  it('toujours visible une fois l\'invincibilité expirée', () => {
    expect(isCharacterVisible(1000, 1000)).toBe(true);
    expect(isCharacterVisible(1000, 1500)).toBe(true);
  });

  it('clignote pendant l\'invincibilité (alterne selon le temps)', () => {
    const until = 10_000;
    expect(isCharacterVisible(until, 0)).toBe(true); // floor(0/200)=0, pair
    expect(isCharacterVisible(until, 200)).toBe(false); // floor(200/200)=1, impair
    expect(isCharacterVisible(until, 400)).toBe(true); // pair
  });
});

describe('victoryBounceOffset', () => {
  it('vaut 0 au temps 0', () => {
    expect(victoryBounceOffset(0)).toBeCloseTo(0, 5);
  });

  it('oscille de façon bornée', () => {
    for (let t = 0; t < 2000; t += 50) {
      expect(Math.abs(victoryBounceOffset(t))).toBeLessThanOrEqual(0.15 + 1e-9);
    }
  });
});
