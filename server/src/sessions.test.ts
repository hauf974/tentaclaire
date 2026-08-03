import { describe, expect, it } from 'vitest';
import { createSessionStore } from './sessions.js';

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

describe('createSessionStore', () => {
  it('suffixe les doublons de pseudo : Alex -> Alex_1 -> Alex_2', () => {
    const store = createSessionStore();
    const a = store.join('Alex', 0);
    const b = store.join('Alex', 0);
    const c = store.join('Alex', 0);

    expect(a.pseudo).toBe('Alex');
    expect(b.pseudo).toBe('Alex_1');
    expect(c.pseudo).toBe('Alex_2');
    expect(new Set([a.token, b.token, c.token]).size).toBe(3);
  });

  it('trim le pseudo avant résolution', () => {
    const store = createSessionStore();
    const a = store.join('  Alex  ', 0);
    expect(a.pseudo).toBe('Alex');
  });

  it('un pseudo expiré (> 8h) redevient disponible sans suffixe', () => {
    const store = createSessionStore();
    store.join('Alex', 0);

    const reused = store.join('Alex', 8 * HOUR + 1);
    expect(reused.pseudo).toBe('Alex'); // l'ancienne session Alex a expiré, pas de collision
  });

  it('un pseudo non expiré reste réservé même déconnecté', () => {
    const store = createSessionStore();
    const first = store.join('Alex', 0);
    store.disconnect(first.token);

    const second = store.join('Alex', 1 * HOUR); // toujours dans les 8h, session non expirée
    expect(second.pseudo).toBe('Alex_1');
  });

  describe('resume', () => {
    it('retrouve une session valide et met à jour lastSeenAt/connected', () => {
      const store = createSessionStore();
      const session = store.join('Alex', 0);
      store.disconnect(session.token);

      const resumed = store.resume(session.token, 100);
      expect(resumed).not.toBeNull();
      expect(resumed?.pseudo).toBe('Alex');
      expect(resumed?.connected).toBe(true);
      expect(resumed?.lastSeenAt).toBe(100);
    });

    it('renvoie null pour un token inconnu', () => {
      const store = createSessionStore();
      expect(store.resume('token-inconnu', 0)).toBeNull();
    });

    it('renvoie null pour un token expiré', () => {
      const store = createSessionStore();
      const session = store.join('Alex', 0);
      expect(store.resume(session.token, 8 * HOUR + 1)).toBeNull();
    });
  });

  describe('playerCount', () => {
    it('compte les sessions connectées', () => {
      const store = createSessionStore();
      store.join('Alex', 0);
      store.join('Bob', 0);
      expect(store.playerCount(0)).toBe(2);
    });

    it('compte une session déconnectée vue il y a moins de 5 min', () => {
      const store = createSessionStore();
      const session = store.join('Alex', 0);
      store.disconnect(session.token);
      expect(store.playerCount(4 * MIN)).toBe(1);
    });

    it('ne compte pas une session déconnectée vue il y a plus de 5 min', () => {
      const store = createSessionStore();
      const session = store.join('Alex', 0);
      store.disconnect(session.token);
      expect(store.playerCount(6 * MIN)).toBe(0);
    });

    it('ne compte pas une session expirée', () => {
      const store = createSessionStore();
      store.join('Alex', 0);
      expect(store.playerCount(8 * HOUR + 1)).toBe(0);
    });
  });

  describe('pruneExpired', () => {
    it("supprime les sessions expirées (le pseudo redevient immédiatement disponible sans suffixe)", () => {
      const store = createSessionStore();
      store.join('Alex', 0);
      store.pruneExpired(8 * HOUR + 1);

      const reused = store.join('Alex', 8 * HOUR + 1);
      expect(reused.pseudo).toBe('Alex');
    });

    it('ne touche pas aux sessions encore valides', () => {
      const store = createSessionStore();
      const session = store.join('Alex', 0);
      store.pruneExpired(1 * HOUR);
      expect(store.resume(session.token, 1 * HOUR)).not.toBeNull();
    });
  });
});
