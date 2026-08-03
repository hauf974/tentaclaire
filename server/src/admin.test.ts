import { defaultGameConfig } from '@tentaclaire/shared';
import type { ConfigChangedPayload } from '@tentaclaire/shared';
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

let built: BuiltServer | null = null;
let uploadDir: string | null = null;
const clients: Socket[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await built?.stop();
  built = null;
  if (uploadDir) removeTempDir(uploadDir);
  uploadDir = null;
});

describe('authentification et config admin (ticket 2.4)', () => {
  it('accès refusé sans cookie', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const response = await built.app.inject({ method: 'GET', url: '/api/admin/config' });
    expect(response.statusCode).toBe(401);
  });

  it('login refusé avec un mauvais mot de passe', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const response = await built.app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { password: 'faux' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('login accepté pose un cookie qui donne accès à /config', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const response = await built.app.inject({
      method: 'GET',
      url: '/api/admin/config',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(defaultGameConfig);
  });

  it('PUT /config rejette une valeur hors bornes (400), rien ne change', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const response = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { gridCols: 3 },
    });
    expect(response.statusCode).toBe(400);
    expect(built.configStore.get().gridCols).toBe(defaultGameConfig.gridCols);
  });

  it('le thème est appliqué à chaud (config_changed diffusé), le nombre de fantômes seulement au reset', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({
      adminPassword: ADMIN_PASSWORD,
      config: { ...defaultGameConfig, ghostCount: 3 },
      uploadDir,
    });
    await built.app.listen({ port: 0, host: '127.0.0.1' });
    const cookie = await login(built);

    const client = ioClient(serverUrl(built), { transports: ['websocket'] });
    clients.push(client);
    await new Promise<void>((resolve) => client.on('connect', () => resolve()));
    const configChanged = new Promise<ConfigChangedPayload>((resolve) => client.once('config_changed', resolve));

    // Thème : C6-immédiat -> config_changed diffusé tout de suite.
    const themeResponse = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { theme: 'neon' },
    });
    expect(themeResponse.statusCode).toBe(200);
    const payload = await configChanged;
    expect(payload.config.theme).toBe('neon');

    // Nombre de fantômes : appliqué à la config, mais le moteur en cours (3 fantômes) ne change pas.
    built.game.reset();
    expect(built.game.getState().ghosts).toHaveLength(3);

    const ghostResponse = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { ghostCount: 10 },
    });
    expect(ghostResponse.statusCode).toBe(200);
    expect(built.game.getState().ghosts).toHaveLength(3); // inchangé tant qu'il n'y a pas eu de reset

    // Seul un reset (avec la config à jour) applique le nouveau nombre de fantômes.
    built.game.reset(built.configStore.get());
    expect(built.game.getState().ghosts).toHaveLength(10);
  });
});
