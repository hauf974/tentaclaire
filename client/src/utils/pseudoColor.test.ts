import { describe, expect, it } from 'vitest';
import { pseudoColor } from './pseudoColor.js';

describe('pseudoColor', () => {
  it('est déterministe : le même pseudo donne toujours la même couleur', () => {
    expect(pseudoColor('Alex')).toBe(pseudoColor('Alex'));
  });

  it('des pseudos différents donnent (généralement) des couleurs différentes', () => {
    expect(pseudoColor('Alex')).not.toBe(pseudoColor('Bob'));
  });

  it('les doublons suffixés restent stables mais distincts', () => {
    expect(pseudoColor('Alex_1')).toBe(pseudoColor('Alex_1'));
    expect(pseudoColor('Alex_1')).not.toBe(pseudoColor('Alex_2'));
  });

  it('renvoie une teinte HSL valide (0-359)', () => {
    const color = pseudoColor('Zorglub');
    const match = /^hsl\((\d+), 70%, 65%\)$/.exec(color);
    expect(match).not.toBeNull();
    const hue = Number(match?.[1]);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it('gère la chaîne vide sans planter', () => {
    expect(() => pseudoColor('')).not.toThrow();
  });
});
