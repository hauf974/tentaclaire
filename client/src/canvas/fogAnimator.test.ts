import { describe, expect, it } from 'vitest';
import { createFogAnimator } from './fogAnimator.js';

describe('createFogAnimator', () => {
  it('setInitial fixe l\'alpha immédiatement, sans fondu', () => {
    const fog = createFogAnimator();
    fog.setInitial([true, false]);
    expect(fog.getAlpha(0)).toBe(0); // révélé
    expect(fog.getAlpha(1)).toBe(1); // masqué
  });

  it('setRevealed change la cible mais pas l\'alpha courant avant tick()', () => {
    const fog = createFogAnimator();
    fog.setInitial([false, false]);
    fog.setRevealed([true, false]);
    expect(fog.getAlpha(0)).toBe(1); // pas encore animé
  });

  it('tick() fait converger vers la cible en ~300 ms', () => {
    const fog = createFogAnimator();
    fog.setInitial([false]);
    fog.setRevealed([true]);

    fog.tick(150);
    expect(fog.getAlpha(0)).toBeCloseTo(0.5, 5);

    fog.tick(150);
    expect(fog.getAlpha(0)).toBeCloseTo(0, 5);
  });

  it('ne dépasse jamais la cible (clamp)', () => {
    const fog = createFogAnimator();
    fog.setInitial([false]);
    fog.setRevealed([true]);
    fog.tick(1000); // bien plus que 300ms
    expect(fog.getAlpha(0)).toBe(0);
  });

  it('anime le ré-obscurcissement (masquage) de la même façon', () => {
    const fog = createFogAnimator();
    fog.setInitial([true]);
    fog.setRevealed([false]);
    fog.tick(300);
    expect(fog.getAlpha(0)).toBeCloseTo(1, 5);
  });

  it('anime chaque case indépendamment', () => {
    const fog = createFogAnimator();
    fog.setInitial([false, false]);
    fog.setRevealed([true, false]); // seule la case 0 change de cible
    fog.tick(150);
    expect(fog.getAlpha(0)).toBeCloseTo(0.5, 5);
    expect(fog.getAlpha(1)).toBe(1); // inchangée
  });

  it("s'adapte à un changement de taille de grille", () => {
    const fog = createFogAnimator();
    fog.setInitial([true, true, true, true]); // grille 2x2
    fog.setInitial([false, false]); // nouvelle grille plus petite
    expect(fog.getAlpha(0)).toBe(1);
    expect(fog.getAlpha(1)).toBe(1);
  });
});
