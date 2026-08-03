import { defaultGameConfig } from '@tentaclaire/shared';
import { describe, expect, it } from 'vitest';
import { createConfigStore, toPublicConfig } from './config.js';

describe('createConfigStore', () => {
  it('get() renvoie la config par défaut au départ', () => {
    const store = createConfigStore();
    expect(store.get()).toEqual(defaultGameConfig);
  });

  it('applique un champ C6-immédiat valide', () => {
    const store = createConfigStore();
    const result = store.update({ theme: 'neon' });
    expect(result).toEqual({ ok: true, errors: [], immediateChange: true });
    expect(store.get().theme).toBe('neon');
  });

  it('applique un champ non-immédiat sans le signaler comme immédiat', () => {
    const store = createConfigStore();
    const result = store.update({ ghostCount: 10 });
    expect(result.ok).toBe(true);
    expect(result.immediateChange).toBe(false);
    expect(store.get().ghostCount).toBe(10);
  });

  it('rejette une valeur hors bornes sans rien appliquer (atomique)', () => {
    const store = createConfigStore();
    const result = store.update({ gridCols: 3, theme: 'neon' }); // gridCols hors bornes (5-50)
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(store.get()).toEqual(defaultGameConfig); // rien n'a changé, même le champ valide
  });

  it('rejette un champ inconnu', () => {
    const store = createConfigStore();
    const result = store.update({ notAField: 1 });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('notAField');
  });

  it('ignore activeImageId (géré par les routes /images)', () => {
    const store = createConfigStore();
    const result = store.update({ activeImageId: 'some-id', theme: 'halloween' });
    expect(result.ok).toBe(true);
    expect(store.get().activeImageId).toBeNull(); // inchangé
    expect(store.get().theme).toBe('halloween');
  });

  it('immediateChange vrai si au moins un champ immédiat parmi plusieurs', () => {
    const store = createConfigStore();
    const result = store.update({ ghostCount: 5, showGridOnFog: false });
    expect(result.immediateChange).toBe(true);
  });

  it('valide torchRadius comme 0|1|2 uniquement', () => {
    const store = createConfigStore();
    expect(store.update({ torchRadius: 1 }).ok).toBe(true);
    expect(store.update({ torchRadius: 3 }).ok).toBe(false);
  });
});

describe('toPublicConfig', () => {
  it("n'expose que le sous-ensemble public", () => {
    const pub = toPublicConfig(defaultGameConfig);
    expect(Object.keys(pub).sort()).toEqual(
      ['qrUrl', 'gridCols', 'gridRows', 'movementMode', 'showGridOnFog', 'showGridOnRevealed', 'theme', 'torchRadius'].sort(),
    );
  });
});
