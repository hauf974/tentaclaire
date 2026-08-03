import type { FullSnapshot } from '@tentaclaire/shared';
import { computeAutoGridRows } from '@tentaclaire/shared';
import type { FastifyInstance } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';

import type { AdminAuth } from './adminAuth.js';
import type { ConfigStore } from './config.js';
import { toPublicConfig } from './config.js';
import type { GameEngine } from './engine/game.js';
import type { ImagesStore } from './images.js';

const COOKIE_NAME = 'tentaclaire_admin';

export interface AdminRoutesDeps {
  configStore: ConfigStore;
  adminAuth: AdminAuth;
  io: SocketIOServer;
  game: GameEngine;
  imagesStore: ImagesStore;
  getSnapshot(): FullSnapshot;
}

/** Enregistre les routes REST admin (préfixe `/api/admin`) et leur garde d'authentification. */
export async function registerAdminRoutes(app: FastifyInstance, deps: AdminRoutesDeps): Promise<void> {
  app.post('/api/admin/login', async (request, reply) => {
    const body = request.body as { password?: unknown } | undefined;
    if (typeof body?.password !== 'string') {
      return reply.code(400).send({ error: 'password requis' });
    }

    const sessionId = deps.adminAuth.login(body.password, Date.now());
    if (!sessionId) {
      return reply.code(401).send({ error: 'mot de passe incorrect' });
    }

    reply.setCookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      path: '/',
      maxAge: 24 * 60 * 60,
      sameSite: 'lax',
    });
    return { ok: true };
  });

  app.post('/api/admin/logout', async (request, reply) => {
    deps.adminAuth.logout(request.cookies[COOKIE_NAME]);
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.addHook('preHandler', async (request, reply) => {
    if (
      !request.url.startsWith('/api/admin/') ||
      request.url === '/api/admin/login' ||
      request.url === '/api/admin/logout'
    ) {
      return;
    }
    const sessionId = request.cookies[COOKIE_NAME];
    if (!deps.adminAuth.isValid(sessionId, Date.now())) {
      return reply.code(401).send({ error: 'non authentifié' });
    }
  });

  app.get('/api/admin/config', async () => deps.configStore.get());

  app.put('/api/admin/config', async (request, reply) => {
    const patch = request.body as Record<string, unknown> | undefined;
    if (typeof patch !== 'object' || patch === null) {
      return reply.code(400).send({ errors: ['corps de requête invalide'] });
    }

    const result = deps.configStore.update(patch);
    if (!result.ok) {
      return reply.code(400).send({ errors: result.errors });
    }

    // Grille auto (G4) : un changement de colonnes (ou le passage en mode
    // auto) doit recalculer les lignes tout de suite, pas seulement à
    // l'activation d'une image — sinon l'aperçu du dashboard et le prochain
    // reset divergeraient de ce qui a été réellement saisi.
    if ('gridCols' in patch || 'gridAuto' in patch) {
      const current = deps.configStore.get();
      if (current.gridAuto && current.activeImageId) {
        const image = deps.imagesStore.get(current.activeImageId);
        if (image) {
          deps.configStore.update({ gridRows: computeAutoGridRows(current.gridCols, image.width, image.height) });
        }
      }
    }

    if (result.immediateChange) {
      deps.io.emit('config_changed', { config: toPublicConfig(deps.configStore.get()) });
    }
    return deps.configStore.get();
  });

  app.post('/api/admin/game/launch', async () => {
    deps.game.launch(deps.configStore.get());
    return { ok: true };
  });

  app.post('/api/admin/game/pause', async () => {
    deps.game.pause();
    return { ok: true };
  });

  app.post('/api/admin/game/reset', async () => {
    deps.game.reset(deps.configStore.get());
    deps.io.emit('snapshot', deps.getSnapshot());
    return { ok: true };
  });
}
