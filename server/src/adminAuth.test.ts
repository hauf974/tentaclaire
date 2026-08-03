import { describe, expect, it } from 'vitest';
import { createAdminAuth } from './adminAuth.js';

describe('createAdminAuth', () => {
  it('login renvoie null si le mot de passe est incorrect', () => {
    const auth = createAdminAuth('secret');
    expect(auth.login('mauvais', 0)).toBeNull();
  });

  it('login renvoie un id de session valide si le mot de passe est correct', () => {
    const auth = createAdminAuth('secret');
    const sessionId = auth.login('secret', 0);
    expect(sessionId).not.toBeNull();
    expect(auth.isValid(sessionId ?? undefined, 0)).toBe(true);
  });

  it('isValid faux pour un id inconnu ou absent', () => {
    const auth = createAdminAuth('secret');
    expect(auth.isValid('id-inconnu', 0)).toBe(false);
    expect(auth.isValid(undefined, 0)).toBe(false);
  });

  it('la session expire après 24h', () => {
    const auth = createAdminAuth('secret');
    const sessionId = auth.login('secret', 0);
    const DAY = 24 * 60 * 60 * 1000;
    expect(auth.isValid(sessionId ?? undefined, DAY - 1)).toBe(true);
    expect(auth.isValid(sessionId ?? undefined, DAY)).toBe(false);
  });

  it('logout invalide la session', () => {
    const auth = createAdminAuth('secret');
    const sessionId = auth.login('secret', 0);
    auth.logout(sessionId ?? undefined);
    expect(auth.isValid(sessionId ?? undefined, 0)).toBe(false);
  });

  it('logout est sans effet sur un id absent ou inconnu', () => {
    const auth = createAdminAuth('secret');
    expect(() => auth.logout(undefined)).not.toThrow();
    expect(() => auth.logout('id-inconnu')).not.toThrow();
  });
});
