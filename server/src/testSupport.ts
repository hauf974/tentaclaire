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
