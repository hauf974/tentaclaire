import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
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
import { createImagesStore, registerImageRoutes, type ImagesStore } from './images.js';
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
  uploadDir?: string;
}

export interface BuiltServer {
  app: FastifyInstance;
  io: SocketIOServer;
  game: GameEngine;
  sessions: SessionStore;
  configStore: ConfigStore;
  adminAuth: AdminAuth;
  imagesStore: ImagesStore;
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
  const uploadDir = options.uploadDir ?? process.env.UPLOAD_DIR ?? '/data/uploads';
  await mkdir(uploadDir, { recursive: true });

  const app = Fastify({ logger: true });

  await app.register(fastifyCookie);
  await app.register(fastifyMultipart);

  app.get('/api/health', async () => ({ ok: true }));

  // Le client Vite est buildé dans client/dist, servi tel quel par Fastify
  // (absent en dev tant que le mode dev ne l'a pas construit).
  const clientDist = join(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist });
  }
  // Images uploadées, sous /uploads (decorateReply: false car fastifyStatic
  // peut déjà avoir été enregistré ci-dessus pour le client).
  await app.register(fastifyStatic, { root: uploadDir, prefix: '/uploads/', decorateReply: false });

  // `app.server` (le http.Server sous-jacent) existe dès la construction de
  // l'instance Fastify, avant même `app.ready()` — nécessaire ici car les
  // routes admin (enregistrées avant `ready()`) ont besoin de `io` pour
  // diffuser `config_changed`.
  const io = new SocketIOServer(app.server);
  const game = createGame(configStore.get(), Math.random, Date.now);
  const sessions = createSessionStore();
  const feed = createFeed();
  const imagesStore = createImagesStore();

  await registerAdminRoutes(app, { configStore, adminAuth, io });
  await registerImageRoutes(app, { configStore, imagesStore, uploadDir });

  function getActiveImageUrl(): string | null {
    const activeId = configStore.get().activeImageId;
    if (!activeId) return null;
    const image = imagesStore.get(activeId);
    return image ? `/uploads/${image.filename}` : null;
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

  return { app, io, game, sessions, configStore, adminAuth, imagesStore, stop };
}
