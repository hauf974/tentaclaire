import { randomUUID } from 'node:crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h (T5)

export interface AdminAuth {
  /** Vérifie le mot de passe et ouvre une session ; renvoie l'id de session ou `null`. */
  login(password: string, now: number): string | null;
  /** Vrai si `sessionId` correspond à une session admin encore valide. */
  isValid(sessionId: string | undefined, now: number): boolean;
  /** Invalide `sessionId` s'il existe. */
  logout(sessionId: string | undefined): void;
}

/** Auth admin minimale (T5) : mot de passe unique, session opaque en mémoire, cookie httpOnly côté appelant. */
export function createAdminAuth(adminPassword: string): AdminAuth {
  const sessions = new Map<string, number>(); // id -> expiresAt

  return {
    login(password, now) {
      if (password !== adminPassword) return null;
      const id = randomUUID();
      sessions.set(id, now + SESSION_TTL_MS);
      return id;
    },

    isValid(sessionId, now) {
      if (!sessionId) return false;
      const expiresAt = sessions.get(sessionId);
      if (expiresAt === undefined) return false;
      if (expiresAt <= now) {
        sessions.delete(sessionId);
        return false;
      }
      return true;
    },

    logout(sessionId) {
      if (sessionId) sessions.delete(sessionId);
    },
  };
}
