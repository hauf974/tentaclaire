import { defaultGameConfig } from '@tentaclaire/shared';
import type { ConfigChangedPayload } from '@tentaclaire/shared';
import { type Socket, io as ioClient } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, type BuiltServer } from './app.js';
import { createTempUploadDir, multipartBody, removeTempDir, TINY_PNG } from './testSupport.js';

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
  it('GET /api/admin/session renvoie toujours 200, authenticated selon le cookie (ticket 7.4)', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });

    const withoutCookie = await built.app.inject({ method: 'GET', url: '/api/admin/session' });
    expect(withoutCookie.statusCode).toBe(200);
    expect(withoutCookie.json()).toEqual({ authenticated: false });

    const cookie = await login(built);
    const withCookie = await built.app.inject({ method: 'GET', url: '/api/admin/session', headers: { cookie } });
    expect(withCookie.statusCode).toBe(200);
    expect(withCookie.json()).toEqual({ authenticated: true });
  });

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

  it('le thème est appliqué à chaud (config_changed diffusé), le point de départ seulement au reset', async () => {
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

    // Point de départ : pas dans LIVE_ENGINE_FIELDS -> appliqué à la config, mais le moteur en cours ne change pas.
    built.game.reset();
    const before = built.game.getState().character.pos;

    const startPositionResponse = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { startPosition: 'center' },
    });
    expect(startPositionResponse.statusCode).toBe(200);
    expect(built.game.getState().character.pos).toEqual(before); // inchangé tant qu'il n'y a pas eu de reset

    // Seul un reset (avec la config à jour) applique le nouveau point de départ.
    built.game.reset(built.configStore.get());
    expect(built.game.getState().character.pos).toEqual({ col: 5, row: 5 }); // 'center' sur la grille 10x10 par défaut
  });

  it('ghostCount, ghostSpeed, ghostBehavior et movementMode sont appliqués à chaud, sans reset (pilotage à chaud)', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({
      adminPassword: ADMIN_PASSWORD,
      config: { ...defaultGameConfig, gridCols: 10, gridRows: 10, ghostCount: 3 },
      uploadDir,
    });
    const cookie = await login(built);

    built.game.reset();
    built.game.launch();
    expect(built.game.getState().ghosts).toHaveLength(3);

    // Augmenter le nombre de fantômes : appliqué tout de suite au moteur en cours.
    const growResponse = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { ghostCount: 7 },
    });
    expect(growResponse.statusCode).toBe(200);
    expect(built.game.getState().ghosts).toHaveLength(7); // pas besoin d'un reset

    // Réduire : tout de suite aussi.
    const shrinkResponse = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { ghostCount: 2 },
    });
    expect(shrinkResponse.statusCode).toBe(200);
    expect(built.game.getState().ghosts).toHaveLength(2);

    // Mode démocratie : appliqué tout de suite, plus besoin d'attendre le prochain lancement.
    const modeResponse = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { movementMode: 'democratie' },
    });
    expect(modeResponse.statusCode).toBe(200);
    built.game.handleInput('up', 'Alex');
    expect(built.game.getState().cooldownRemainingMs).toBe(0); // plus en mode chaos -> plus de cooldown
  });

  it("Lancer depuis 'reset' adopte un changement de config fait après Réinitialiser (ticket 5.2, C6)", async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({
      adminPassword: ADMIN_PASSWORD,
      config: { ...defaultGameConfig, gridCols: 6, gridRows: 6, ghostCount: 0, chaosCooldownMs: 500 },
      uploadDir,
    });
    const cookie = await login(built);

    await built.app.inject({ method: 'POST', url: '/api/admin/game/reset', headers: { cookie } });
    await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { chaosCooldownMs: 5000 },
    });
    await built.app.inject({ method: 'POST', url: '/api/admin/game/launch', headers: { cookie } });

    built.game.handleInput('up', 'Alex');
    expect(built.game.getState().cooldownRemainingMs).toBeGreaterThan(4000);
  });

  it("un changement de gridCols en mode auto recalcule gridRows tout de suite, pas seulement à l'activation (ticket 5.4, G4)", async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const { body, contentType } = multipartBody('carre.png', 'image/png', TINY_PNG); // image 1x1 : lignes = colonnes
    const upload = await built.app.inject({
      method: 'POST',
      url: '/api/admin/images',
      headers: { cookie, 'content-type': contentType },
      payload: body,
    });
    const imageId = upload.json().id as string;

    await built.app.inject({
      method: 'PUT',
      url: `/api/admin/images/${imageId}/activate`,
      headers: { cookie },
    });
    expect(built.configStore.get().gridRows).toBe(built.configStore.get().gridCols);

    const response = await built.app.inject({
      method: 'PUT',
      url: '/api/admin/config',
      headers: { cookie },
      payload: { gridCols: 22 },
    });
    expect(response.statusCode).toBe(200);
    expect(built.configStore.get().gridCols).toBe(22);
    expect(built.configStore.get().gridRows).toBe(22); // recalculé, pas seulement à l'activation
  });

  it('logout invalide le cookie (ticket 5.1)', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const before = await built.app.inject({ method: 'GET', url: '/api/admin/config', headers: { cookie } });
    expect(before.statusCode).toBe(200);

    const logout = await built.app.inject({ method: 'POST', url: '/api/admin/logout', headers: { cookie } });
    expect(logout.statusCode).toBe(200);

    const after = await built.app.inject({ method: 'GET', url: '/api/admin/config', headers: { cookie } });
    expect(after.statusCode).toBe(401);
  });

  it('logout sans cookie ne plante pas (idempotent)', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });

    const response = await built.app.inject({ method: 'POST', url: '/api/admin/logout' });
    expect(response.statusCode).toBe(200);
  });
});
