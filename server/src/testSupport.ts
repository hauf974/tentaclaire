import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Répertoire d'upload temporaire pour les tests (évite le défaut /data/uploads, non accessible hors conteneur). */
export function createTempUploadDir(): string {
  return mkdtempSync(join(tmpdir(), 'tentaclaire-uploads-'));
}

export function removeTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// PNG 1x1 transparent minimal (bien connu), pour tester un upload réellement valide.
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export function multipartBody(
  filename: string,
  contentType: string,
  data: Buffer,
): { body: Buffer; contentType: string } {
  const boundary = '----tentaclaireTestBoundary';
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, data, tail]), contentType: `multipart/form-data; boundary=${boundary}` };
}
