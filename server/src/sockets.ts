import type {
  ClientRole,
  FullSnapshot,
  HelloAckPayload,
  HelloPayload,
  InputPayload,
  JoinAckPayload,
  JoinPayload,
  PublicConfig,
} from '@tentaclaire/shared';
import type { Server as SocketIOServer } from 'socket.io';

import type { Feed } from './feed.js';
import type { GameEngine } from './engine/game.js';
import type { SessionStore } from './sessions.js';

const VALID_DIRECTIONS = new Set(['up', 'down', 'left', 'right']);
const VALID_ROLES = new Set<ClientRole>(['player', 'screen', 'admin']);
const MIN_PSEUDO_LENGTH = 1;
const MAX_PSEUDO_LENGTH = 20;

export interface SocketsDeps {
  game: GameEngine;
  sessions: SessionStore;
  feed: Feed;
  getPublicConfig(): PublicConfig;
  getActiveImageUrl(): string | null;
}

/** Exporté pour être réutilisé après un `reset()` piloté par l'admin (ticket 2.6). */
export function buildSnapshot(deps: SocketsDeps): FullSnapshot {
  return {
    config: deps.getPublicConfig(),
    state: deps.game.getState(),
    activeImageUrl: deps.getActiveImageUrl(),
    feed: deps.feed.list(),
  };
}

/**
 * Câble le protocole joueur/écran/admin (hello, join, input) sur le moteur et
 * les sessions. Toute entrée invalide est ignorée silencieusement (jamais de
 * crash), conformément aux règles transverses du protocole.
 */
export function registerSockets(io: SocketIOServer, deps: SocketsDeps): void {
  io.on('connection', (socket) => {
    let role: ClientRole | null = null;
    let token: string | null = null;

    socket.on('hello', (payload: HelloPayload) => {
      if (typeof payload !== 'object' || payload === null || !VALID_ROLES.has(payload.role)) return;
      role = payload.role;

      const session =
        role === 'player' && typeof payload.token === 'string'
          ? deps.sessions.resume(payload.token, Date.now())
          : null;
      token = session?.token ?? null;

      const ack: HelloAckPayload = {
        ok: true,
        session: role === 'player' ? (session ? { token: session.token, pseudo: session.pseudo } : null) : null,
        snapshot: buildSnapshot(deps),
      };
      socket.emit('hello_ack', ack);
    });

    socket.on('join', (payload: JoinPayload) => {
      if (role !== 'player') return;
      if (typeof payload !== 'object' || payload === null || typeof payload.pseudo !== 'string') return;

      const trimmed = payload.pseudo.trim();
      if (trimmed.length < MIN_PSEUDO_LENGTH || trimmed.length > MAX_PSEUDO_LENGTH) return;

      const session = deps.sessions.join(trimmed, Date.now());
      token = session.token;

      const ack: JoinAckPayload = { token: session.token, pseudo: session.pseudo };
      socket.emit('join_ack', ack);
    });

    socket.on('input', (payload: InputPayload) => {
      if (role !== 'player' || token === null) return;
      if (typeof payload !== 'object' || payload === null || !VALID_DIRECTIONS.has(payload.direction)) return;

      const session = deps.sessions.resume(token, Date.now());
      if (!session) return;

      deps.game.handleInput(payload.direction, session.pseudo);
    });

    socket.on('disconnect', () => {
      if (token !== null) deps.sessions.disconnect(token);
    });
  });
}
