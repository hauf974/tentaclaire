import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import type { GameConfig, GameEventType } from '@tentaclaire/shared';
import { defaultGameConfig } from '@tentaclaire/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

import type { EngineEvent } from './engine/events.js';
import { createGame, type GameEngine } from './engine/game.js';
import { cloneGameState, computeStateDelta } from './realtime.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TICK_MS = 100;

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

  let lastBroadcast: ReturnType<GameEngine['getState']> | null = null;

  const interval = setInterval(() => {
    // Remplacé par le vrai compteur de sessions au ticket 2.2.
    game.setPlayerCount(0);
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
      }
      // 'input_accepted' -> feed_add : relayé au ticket 2.3 (nécessite les sessions).
    }
  }, TICK_MS);

  io.on('connection', (socket) => {
    app.log.info({ id: socket.id }, 'socket connecté');
  });

  async function stop(): Promise<void> {
    clearInterval(interval);
    await io.close();
    await app.close();
  }

  return { app, io, game, stop };
}
