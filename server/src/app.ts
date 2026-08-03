import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import type { GameConfig, GameEventType, PublicConfig } from '@tentaclaire/shared';
import { defaultGameConfig } from '@tentaclaire/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

import type { EngineEvent } from './engine/events.js';
import { createGame, type GameEngine } from './engine/game.js';
import { createFeed } from './feed.js';
import { cloneGameState, computeStateDelta } from './realtime.js';
import { createSessionStore, type SessionStore } from './sessions.js';
import { registerSockets } from './sockets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TICK_MS = 100;
const PRUNE_SESSIONS_MS = 60_000;

const MARKER_EVENT_TYPES: ReadonlySet<string> = new Set<GameEventType>([
  'victory',
  'defeat',
  'paused',
  'resumed',
  'reset',
  'character_died',
]);

function isMarkerEvent(event: EngineEvent): event is EngineEvent & { type: GameEventType } {
  return MARKER_EVENT_TYPES.has(event.type);
}

export interface BuildServerOptions {
  config?: GameConfig;
}

export interface BuiltServer {
  app: FastifyInstance;
  io: SocketIOServer;
  game: GameEngine;
  sessions: SessionStore;
  stop(): Promise<void>;
}

/**
 * Composition root : construit l'application (Fastify + Socket.IO + moteur +
 * boucle de tick) sans démarrer l'écoute réseau — c'est `index.ts` qui
 * appelle `app.listen()`. Les tests appellent `buildServer()` directement et
 * écoutent sur un port éphémère (`{ port: 0 }`), fermé via `stop()`.
 */
export async function buildServer(options: BuildServerOptions = {}): Promise<BuiltServer> {
  const config = options.config ?? defaultGameConfig;
  const app = Fastify({ logger: true });

  app.get('/api/health', async () => ({ ok: true }));

  // Le client Vite est buildé dans client/dist, servi tel quel par Fastify
  // (absent en dev tant que le mode dev ne l'a pas construit).
  const clientDist = join(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist });
  }

  await app.ready();

  const io = new SocketIOServer(app.server);
  const game = createGame(config, Math.random, Date.now);
  const sessions = createSessionStore();
  const feed = createFeed();

  // Dérivé de la config du moteur pour l'instant ; ticket 2.4 branchera la
  // config admin mutable, ticket 2.5 la galerie d'images.
  function getPublicConfig(): PublicConfig {
    return {
      gridCols: config.gridCols,
      gridRows: config.gridRows,
      showGridOnFog: config.showGridOnFog,
      showGridOnRevealed: config.showGridOnRevealed,
      movementMode: config.movementMode,
      torchRadius: config.torchRadius,
      theme: config.theme,
    };
  }
  function getActiveImageUrl(): string | null {
    return null;
  }

  registerSockets(io, { game, sessions, feed, getPublicConfig, getActiveImageUrl });

  let lastBroadcast: ReturnType<GameEngine['getState']> | null = null;

  const interval = setInterval(() => {
    game.setPlayerCount(sessions.playerCount(Date.now()));
    game.tick(Date.now());

    const snapshot = cloneGameState(game.getState());
    const delta = computeStateDelta(lastBroadcast, snapshot);
    if (delta) {
      io.emit('state_delta', delta);
    }
    lastBroadcast = snapshot;

    for (const event of game.drainEvents()) {
      if (isMarkerEvent(event)) {
        io.emit('game_event', { type: event.type });
      } else if (event.type === 'input_accepted') {
        const entry = feed.add(event.pseudo, event.direction, Date.now());
        io.emit('feed_add', { entry });
      }
    }
  }, TICK_MS);

  const pruneInterval = setInterval(() => {
    sessions.pruneExpired(Date.now());
  }, PRUNE_SESSIONS_MS);

  async function stop(): Promise<void> {
    clearInterval(interval);
    clearInterval(pruneInterval);
    await io.close();
    await app.close();
  }

  return { app, io, game, sessions, stop };
}
