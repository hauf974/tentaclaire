import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

export const ADMIN_PASSWORD = 'tentaclaire';

// PNG 1x1 transparent minimal (même fixture que server/src/testSupport.ts).
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/admin');
  await page.fill('input[type=password]', ADMIN_PASSWORD);
  await page.click('button');
  await page.waitForSelector('.top-bar');
}

/** Configure la partie via l'API REST admin (le contexte de `page` porte déjà le cookie de session). */
export async function setConfig(page: Page, patch: Record<string, unknown>): Promise<void> {
  const response = await page.request.put('/api/admin/config', { data: patch });
  if (!response.ok()) {
    throw new Error(`PUT /api/admin/config a échoué (${response.status()}) : ${await response.text()}`);
  }
}

export async function resetGame(page: Page): Promise<void> {
  const response = await page.request.post('/api/admin/game/reset');
  if (!response.ok()) throw new Error(`reset a échoué (${response.status()})`);
}

export async function launchGame(page: Page): Promise<void> {
  const response = await page.request.post('/api/admin/game/launch');
  if (!response.ok()) throw new Error(`launch a échoué (${response.status()})`);
}

export async function pauseGame(page: Page): Promise<void> {
  const response = await page.request.post('/api/admin/game/pause');
  if (!response.ok()) throw new Error(`pause a échoué (${response.status()})`);
}

/** Upload puis active une image de test via le formulaire admin (vérifie le vrai parcours UI, ticket 7.1). */
export async function uploadAndActivateTestImage(page: Page): Promise<void> {
  const imgPath = join(tmpdir(), `tentaclaire-e2e-${Date.now()}.png`);
  writeFileSync(imgPath, TINY_PNG);

  const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.file-button')]);
  await fileChooser.setFiles(imgPath);
  await page.waitForSelector('.thumbnail');
  await page.click('.thumbnail-actions button:first-child');
  await page.waitForSelector('.badge');
}

export async function joinAsPlayer(page: Page, pseudo: string): Promise<void> {
  await page.goto('/play');
  await page.fill('input.pseudo-input', pseudo);
  await page.click('button.join-button');
  await page.waitForSelector('.controller');
}
