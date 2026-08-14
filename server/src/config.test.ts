import { defaultGameConfig } from '@tentaclaire/shared';
import { describe, expect, it } from 'vitest';
import { createConfigStore, LIVE_ENGINE_FIELDS, toPublicConfig } from './config.js';

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

  it('pilotage à chaud (déplacements) : movementMode/chaosCooldownMs/democracyWindowMs sont C6-immédiats', () => {
    const store = createConfigStore();
    expect(store.update({ movementMode: 'democratie' }).immediateChange).toBe(true);
    expect(store.update({ chaosCooldownMs: 800 }).immediateChange).toBe(true);
    expect(store.update({ democracyWindowMs: 600 }).immediateChange).toBe(true);
  });

  it('pilotage à chaud (fantômes) : ghostCount/ghostSpeed/ghostBehavior appliqués (config), mais pas C6-immédiats (hors PublicConfig)', () => {
    const store = createConfigStore();
    expect(store.update({ ghostCount: 8 }).immediateChange).toBe(false);
    expect(store.update({ ghostSpeed: 2 }).immediateChange).toBe(false);
    expect(store.update({ ghostBehavior: 'traque' }).immediateChange).toBe(false);
    expect(store.get()).toMatchObject({ ghostCount: 8, ghostSpeed: 2, ghostBehavior: 'traque' });
  });

  it('LIVE_ENGINE_FIELDS liste exactement les six champs de pilotage à chaud du moteur', () => {
    expect([...LIVE_ENGINE_FIELDS].sort()).toEqual(
      ['movementMode', 'chaosCooldownMs', 'democracyWindowMs', 'ghostCount', 'ghostSpeed', 'ghostBehavior'].sort(),
    );
  });

  it('valide torchRadius comme 0|1|2 uniquement', () => {
    const store = createConfigStore();
    expect(store.update({ torchRadius: 1 }).ok).toBe(true);
    expect(store.update({ torchRadius: 3 }).ok).toBe(false);
  });

  it('accepte ghostBehavior "extinction" (R1), rejette une valeur inconnue', () => {
    const store = createConfigStore();
    expect(store.update({ ghostBehavior: 'extinction' }).ok).toBe(true);
    expect(store.get().ghostBehavior).toBe('extinction');
    expect(store.update({ ghostBehavior: 'invasion' }).ok).toBe(false);
  });

  it('startPosition (R3) : les 10 valeurs acceptées, une valeur invalide refusée, champ non-immédiat', () => {
    const store = createConfigStore();
    const values = [
      'top-left',
      'top-center',
      'top-right',
      'middle-left',
      'center',
      'middle-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'random',
    ] as const;
    for (const value of values) {
      const result = store.update({ startPosition: value });
      expect(result.ok).toBe(true);
      expect(result.immediateChange).toBe(false);
      expect(store.get().startPosition).toBe(value);
    }
    expect(store.update({ startPosition: 'top' }).ok).toBe(false);
  });
});

describe('toPublicConfig', () => {
  it("n'expose que le sous-ensemble public", () => {
    const pub = toPublicConfig(defaultGameConfig);
    expect(Object.keys(pub).sort()).toEqual(
      [
        'qrUrl',
        'gridCols',
        'gridRows',
        'movementMode',
        'chaosCooldownMs',
        'democracyWindowMs',
        'showGridOnFog',
        'showGridOnRevealed',
        'theme',
        'torchRadius',
      ].sort(),
    );
  });
});
