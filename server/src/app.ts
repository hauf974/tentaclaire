import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import type { GameConfig, GameEventType } from '@tentaclaire/shared';
import { defaultGameConfig } from '@tentaclaire/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

import { createAdminAuth, type AdminAuth } from './adminAuth.js';
import { registerAdminRoutes } from './admin.js';
import { createConfigStore, toPublicConfig, type ConfigStore } from './config.js';
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
  adminPassword?: string;
}

export interface BuiltServer {
  app: FastifyInstance;
  io: SocketIOServer;
  game: GameEngine;
  sessions: SessionStore;
  configStore: ConfigStore;
  adminAuth: AdminAuth;
  stop(): Promise<void>;
}

/**
 * Composition root : construit l'application (Fastify + Socket.IO + moteur +
 * boucle de tick) sans démarrer l'écoute réseau — c'est `index.ts` qui
 * appelle `app.listen()`. Les tests appellent `buildServer()` directement et
 * écoutent sur un port éphémère (`{ port: 0 }`), fermé via `stop()`.
 */
export async function buildServer(options: BuildServerOptions = {}): Promise<BuiltServer> {
  const configStore = createConfigStore(options.config ?? defaultGameConfig);
  const adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD ?? 'tentaclaire';
  const adminAuth = createAdminAuth(adminPassword);
  const app = Fastify({ logger: true });

  await app.register(fastifyCookie);

  app.get('/api/health', async () => ({ ok: true }));

  // Le client Vite est buildé dans client/dist, servi tel quel par Fastify
  // (absent en dev tant que le mode dev ne l'a pas construit).
  const clientDist = join(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist });
  }

  // `app.server` (le http.Server sous-jacent) existe dès la construction de
  // l'instance Fastify, avant même `app.ready()` — nécessaire ici car les
  // routes admin (enregistrées avant `ready()`) ont besoin de `io` pour
  // diffuser `config_changed`.
  const io = new SocketIOServer(app.server);
  const game = createGame(configStore.get(), Math.random, Date.now);
  const sessions = createSessionStore();
  const feed = createFeed();

  await registerAdminRoutes(app, { configStore, adminAuth, io });

  function getActiveImageUrl(): string | null {
    return null; // ticket 2.5
  }

  registerSockets(io, {
    game,
    sessions,
    feed,
    getPublicConfig: () => toPublicConfig(configStore.get()),
    getActiveImageUrl,
  });

  await app.ready();

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

  return { app, io, game, sessions, configStore, adminAuth, stop };
}
