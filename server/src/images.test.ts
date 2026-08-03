import { defaultGameConfig } from '@tentaclaire/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer, type BuiltServer } from './app.js';
import { detectImageType } from './images.js';
import { createTempUploadDir, removeTempDir } from './testSupport.js';

const ADMIN_PASSWORD = 'test-password';

// PNG 1x1 transparent minimal (bien connu), pour tester un upload réellement valide.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function multipartBody(filename: string, contentType: string, data: Buffer): { body: Buffer; contentType: string } {
  const boundary = '----tentaclaireTestBoundary';
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, data, tail]), contentType: `multipart/form-data; boundary=${boundary}` };
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

afterEach(async () => {
  await built?.stop();
  built = null;
  if (uploadDir) removeTempDir(uploadDir);
  uploadDir = null;
});

describe('detectImageType (magic bytes, G2)', () => {
  it('reconnaît un JPEG', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('jpg');
  });

  it('reconnaît un PNG', () => {
    expect(detectImageType(TINY_PNG)).toBe('png');
  });

  it('reconnaît un WebP (RIFF....WEBP)', () => {
    const webp = Buffer.concat([
      Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF
      Buffer.from([0, 0, 0, 0]), // taille (peu importe ici)
      Buffer.from([0x57, 0x45, 0x42, 0x50]), // WEBP
    ]);
    expect(detectImageType(webp)).toBe('webp');
  });

  it("rejette un format non reconnu", () => {
    expect(detectImageType(Buffer.from('ceci n\'est pas une image'))).toBeNull();
  });

  it('rejette un buffer trop court', () => {
    expect(detectImageType(Buffer.from([0xff]))).toBeNull();
  });
});

describe('galerie d\'images (ticket 2.5)', () => {
  it('upload valide : format et dimensions lus correctement', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const { body, contentType } = multipartBody('mystery.png', 'image/png', TINY_PNG);
    const response = await built.app.inject({
      method: 'POST',
      url: '/api/admin/images',
      headers: { cookie, 'content-type': contentType },
      payload: body,
    });

    expect(response.statusCode).toBe(200);
    const image = response.json();
    expect(image.width).toBe(1);
    expect(image.height).toBe(1);
    expect(image.filename).toMatch(/\.png$/);
    expect(image.originalName).toBe('mystery.png');

    const list = await built.app.inject({ method: 'GET', url: '/api/admin/images', headers: { cookie } });
    expect(list.json()).toHaveLength(1);
  });

  it('upload invalide : format non reconnu -> 400', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const garbage = Buffer.from('ceci n\'est pas une image');
    const { body, contentType } = multipartBody('fake.png', 'image/png', garbage);
    const response = await built.app.inject({
      method: 'POST',
      url: '/api/admin/images',
      headers: { cookie, 'content-type': contentType },
      payload: body,
    });

    expect(response.statusCode).toBe(400);
  });

  it('upload trop lourd (> 10 Mo) -> 400', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const huge = Buffer.alloc(10 * 1024 * 1024 + 1024, 0);
    const { body, contentType } = multipartBody('huge.png', 'image/png', huge);
    const response = await built.app.inject({
      method: 'POST',
      url: '/api/admin/images',
      headers: { cookie, 'content-type': contentType },
      payload: body,
    });

    expect(response.statusCode).toBe(413); // Payload Too Large
  });

  it('activation : met à jour activeImageId et recalcule la grille auto', async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({
      adminPassword: ADMIN_PASSWORD,
      config: { ...defaultGameConfig, gridAuto: true, gridCols: 10 },
      uploadDir,
    });
    const cookie = await login(built);

    // Image "16:9" fictive : on upload la PNG minimale mais on vérifie surtout le câblage
    // (le recalcul utilise les dimensions réelles lues, ici 1x1 -> gridRows = 10).
    const { body, contentType } = multipartBody('mystery.png', 'image/png', TINY_PNG);
    const uploadResponse = await built.app.inject({
      method: 'POST',
      url: '/api/admin/images',
      headers: { cookie, 'content-type': contentType },
      payload: body,
    });
    const image = uploadResponse.json();

    const activateResponse = await built.app.inject({
      method: 'PUT',
      url: `/api/admin/images/${image.id}/activate`,
      headers: { cookie },
    });
    expect(activateResponse.statusCode).toBe(200);
    expect(built.configStore.get().activeImageId).toBe(image.id);
    expect(built.configStore.get().gridRows).toBe(10); // ratio 1:1 -> même nombre de lignes que de colonnes
  });

  it("suppression refusée pour l'image active, acceptée sinon", async () => {
    uploadDir = createTempUploadDir();
    built = await buildServer({ adminPassword: ADMIN_PASSWORD, uploadDir });
    const cookie = await login(built);

    const { body, contentType } = multipartBody('mystery.png', 'image/png', TINY_PNG);
    const upload1 = await built.app.inject({
      method: 'POST',
      url: '/api/admin/images',
      headers: { cookie, 'content-type': contentType },
      payload: body,
    });
    const image1 = upload1.json();

    await built.app.inject({
      method: 'PUT',
      url: `/api/admin/images/${image1.id}/activate`,
      headers: { cookie },
    });

    const refused = await built.app.inject({
      method: 'DELETE',
      url: `/api/admin/images/${image1.id}`,
      headers: { cookie },
    });
    expect(refused.statusCode).toBe(400);

    const body2 = multipartBody('other.png', 'image/png', TINY_PNG);
    const upload2 = await built.app.inject({
      method: 'POST',
      url: '/api/admin/images',
      headers: { cookie, 'content-type': body2.contentType },
      payload: body2.body,
    });
    const image2 = upload2.json();

    const accepted = await built.app.inject({
      method: 'DELETE',
      url: `/api/admin/images/${image2.id}`,
      headers: { cookie },
    });
    expect(accepted.statusCode).toBe(200);
  });
});
