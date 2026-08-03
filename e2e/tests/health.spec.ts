import { expect, test } from '@playwright/test';

test('le serveur répond sur /api/health', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ ok: true });
});
