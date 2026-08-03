import { randomUUID } from 'node:crypto';

import type { PlayerSession } from '@tentaclaire/shared';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 h (T10)
const INACTIVITY_TTL_MS = 5 * 60 * 1000; // 5 min (T11)

export interface SessionStore {
  /** Crée une nouvelle session pour `pseudo` (suffixé si doublon parmi les sessions actives, J16). */
  join(pseudo: string, now: number): PlayerSession;
  /** Reprend une session par token : met à jour lastSeenAt/connected. `null` si inconnu ou expiré. */
  resume(token: string, now: number): PlayerSession | null;
  /** Marque une session comme déconnectée (le pseudo reste réservé jusqu'à expiration, T10). */
  disconnect(token: string): void;
  /** Sessions comptées : connectées, ou vues il y a moins de 5 min (T11). */
  playerCount(now: number): number;
  /** Supprime définitivement les sessions expirées (ménage périodique). */
  pruneExpired(now: number): void;
}

export function createSessionStore(): SessionStore {
  const sessions = new Map<string, PlayerSession>();

  function isExpired(session: PlayerSession, now: number): boolean {
    return now - session.createdAt >= SESSION_TTL_MS;
  }

  function activeSessions(now: number): PlayerSession[] {
    return [...sessions.values()].filter((session) => !isExpired(session, now));
  }

  function resolvePseudo(trimmed: string, now: number): string {
    const taken = new Set(activeSessions(now).map((session) => session.pseudo));
    if (!taken.has(trimmed)) return trimmed;
    let suffix = 1;
    while (taken.has(`${trimmed}_${suffix}`)) suffix++;
    return `${trimmed}_${suffix}`;
  }

  return {
    join(pseudo, now) {
      const trimmed = pseudo.trim();
      const session: PlayerSession = {
        token: randomUUID(),
        pseudo: resolvePseudo(trimmed, now),
        createdAt: now,
        lastSeenAt: now,
        connected: true,
      };
      sessions.set(session.token, session);
      return session;
    },

    resume(token, now) {
      const session = sessions.get(token);
      if (!session || isExpired(session, now)) return null;
      session.lastSeenAt = now;
      session.connected = true;
      return session;
    },

    disconnect(token) {
      const session = sessions.get(token);
      if (session) session.connected = false;
    },

    playerCount(now) {
      return activeSessions(now).filter(
        (session) => session.connected || now - session.lastSeenAt < INACTIVITY_TTL_MS,
      ).length;
    },

    pruneExpired(now) {
      for (const [token, session] of sessions) {
        if (isExpired(session, now)) sessions.delete(token);
      }
    },
  };
}
