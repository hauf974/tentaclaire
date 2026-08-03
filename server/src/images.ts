import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GalleryImage } from '@tentaclaire/shared';
import { computeAutoGridRows } from '@tentaclaire/shared';
import type { FastifyInstance } from 'fastify';
import { imageSize } from 'image-size';

import type { ConfigStore } from './config.js';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Mo (G2)

type DetectedType = 'jpg' | 'png' | 'webp';

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50]; // "WEBP" à l'offset 8

function matchesMagic(buffer: Buffer, magic: number[], offset = 0): boolean {
  if (buffer.length < offset + magic.length) return false;
  return magic.every((byte, index) => buffer[offset + index] === byte);
}

/** Détection du format réel par magic bytes (G2) — n'importe jamais sur l'extension/le mimetype déclarés. */
export function detectImageType(buffer: Buffer): DetectedType | null {
  if (matchesMagic(buffer, JPEG_MAGIC)) return 'jpg';
  if (matchesMagic(buffer, PNG_MAGIC)) return 'png';
  if (matchesMagic(buffer, RIFF_MAGIC) && matchesMagic(buffer, WEBP_MAGIC, 8)) return 'webp';
  return null;
}

export interface ImagesStore {
  list(): GalleryImage[];
  get(id: string): GalleryImage | undefined;
  add(image: GalleryImage): void;
  remove(id: string): boolean;
}

export function createImagesStore(): ImagesStore {
  const images = new Map<string, GalleryImage>();
  return {
    list: () => [...images.values()],
    get: (id) => images.get(id),
    add: (image) => {
      images.set(image.id, image);
    },
    remove: (id) => images.delete(id),
  };
}

export interface ImagesRoutesDeps {
  configStore: ConfigStore;
  imagesStore: ImagesStore;
  uploadDir: string;
}

/** Enregistre les routes REST de la galerie (préfixe `/api/admin/images`). Nécessite `@fastify/multipart`. */
export async function registerImageRoutes(app: FastifyInstance, deps: ImagesRoutesDeps): Promise<void> {
  app.get('/api/admin/images', async () => deps.imagesStore.list());

  app.post('/api/admin/images', async (request, reply) => {
    const file = await request.file({ limits: { fileSize: MAX_UPLOAD_BYTES } });
    if (!file) return reply.code(400).send({ error: 'fichier requis' });

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch {
      // @fastify/multipart lève une erreur (413) dès que la limite fileSize est dépassée.
      return reply.code(413).send({ error: 'fichier trop volumineux (10 Mo maximum)' });
    }

    const type = detectImageType(buffer);
    if (!type) {
      return reply.code(400).send({ error: 'format non reconnu (JPG, PNG ou WebP attendu)' });
    }

    let dimensions: { width: number; height: number };
    try {
      const result = imageSize(buffer);
      dimensions = { width: result.width, height: result.height };
    } catch {
      return reply.code(400).send({ error: 'image invalide, dimensions illisibles' });
    }

    const id = randomUUID();
    const filename = `${id}.${type}`;
    await writeFile(join(deps.uploadDir, filename), buffer);

    const image: GalleryImage = {
      id,
      filename,
      originalName: file.filename,
      width: dimensions.width,
      height: dimensions.height,
      uploadedAt: Date.now(),
    };
    deps.imagesStore.add(image);
    return image;
  });

  app.delete('/api/admin/images/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (deps.configStore.get().activeImageId === id) {
      return reply.code(400).send({ error: "impossible de supprimer l'image active" });
    }

    const image = deps.imagesStore.get(id);
    if (!image) return reply.code(404).send({ error: 'image introuvable' });

    await unlink(join(deps.uploadDir, image.filename)).catch(() => undefined);
    deps.imagesStore.remove(id);
    return { ok: true };
  });

  app.put('/api/admin/images/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const image = deps.imagesStore.get(id);
    if (!image) return reply.code(404).send({ error: 'image introuvable' });

    deps.configStore.setActiveImage(id);

    const config = deps.configStore.get();
    if (config.gridAuto) {
      const gridRows = computeAutoGridRows(config.gridCols, image.width, image.height);
      deps.configStore.update({ gridRows });
    }

    return deps.configStore.get();
  });
}
