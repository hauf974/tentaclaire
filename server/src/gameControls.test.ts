import { defaultGameConfig } from '@tentaclaire/shared';
import type { FullSnapshot } from '@tentaclaire/shared';
import { type Socket, io as ioClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, type BuiltServer } from './app.js';
import { createTempUploadDir, removeTempDir } from './testSupport.js';

const ADMIN_PASSWORD = 'test-password';

function serverUrl(built: BuiltServer): string {
  const address = built.app.server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur inattendue');
  return `http://127.0.0.1:${address.port}`;
}

function waitUntil(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (predicate()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('timeout en attente de la condition'));
      }
    }, 20);
  });
}

async function login(built: BuiltServer): Promise<string> {
  const response = await built.app.inject({
    method: 'POST',
    url: '/api/admin/login',
    payload: { password: ADMIN_PASSWORD },
  });
  const setCookie = response.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!cookieHeader) throw new Error('pas de cookie renvoyé par /login');
  return cookieHeader.split(';')[0] ?? '';
}

async function post(built: BuiltServer, cookie: string, url: string): Promise<void> {
  const response = await built.app.inject({ method: 'POST', url, headers: { cookie } });
  expect(response.statusCode).toBe(200);
}

let built: BuiltServer | null = null;
let uploadDir: string | null = null;
let client: Socket | null = null;

afterEach(async () => {
  client?.disconnect();
  client = null;
  await built?.stop();
  built = null;
  if (uploadDir) removeTempDir(uploadDir);
  uploadDir = null;
});

describe('contrôles de session (ticket 2.6)', () => {
  it('cycle réinitialiser -> lancer -> pause -> lancer -> réinitialiser, observé en socket', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({
      adminPassword: ADMIN_PASSWORD,
      config: { ...defaultGameConfig, gridCols: 6, gridRows: 6, ghostCount: 0 },
      uploadDir,
    });
    await built.app.listen({ port: 0, host: '127.0.0.1' });
    const cookie = await login(built);

    const gameEvents: string[] = [];
    const snapshots: FullSnapshot[] = [];
    client = ioClient(serverUrl(built), { transports: ['websocket'] });
    client.on('game_event', (payload: { type: string }) => gameEvents.push(payload.type));
    client.on('snapshot', (payload: FullSnapshot) => snapshots.push(payload));
    await new Promise<void>((resolve) => client?.on('connect', () => resolve()));

    // Réinitialiser depuis idle : snapshot complet diffusé immédiatement par la route.
    await post(built, cookie, '/api/admin/game/reset');
    await waitUntil(() => snapshots.length >= 1);
    expect(snapshots[0]?.state.phase).toBe('reset');
    expect(built.game.getState().phase).toBe('reset');

    // Lancer : reset -> running.
    await post(built, cookie, '/api/admin/game/launch');
    await waitUntil(() => built?.game.getState().phase === 'running');

    // Pause : running -> paused, game_event 'paused' diffusé au tick suivant.
    await post(built, cookie, '/api/admin/game/pause');
    await waitUntil(() => gameEvents.includes('paused'));
    expect(built.game.getState().phase).toBe('paused');

    // Lancer depuis paused : émet 'resumed'.
    await post(built, cookie, '/api/admin/game/launch');
    await waitUntil(() => gameEvents.includes('resumed'));
    expect(built.game.getState().phase).toBe('running');

    // Réinitialiser à nouveau : 2e snapshot complet.
    await post(built, cookie, '/api/admin/game/reset');
    await waitUntil(() => snapshots.length >= 2);
    expect(snapshots[1]?.state.phase).toBe('reset');
    expect(gameEvents).toContain('reset');
  });

  it('les routes /game/* sont protégées comme le reste de /api/admin', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });

    const response = await built.app.inject({ method: 'POST', url: '/api/admin/game/launch' });
    expect(response.statusCode).toBe(401);
  });
});
