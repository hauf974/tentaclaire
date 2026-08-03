import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  webServer: {
    command: 'node server/dist/index.js',
    cwd: '..',
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
});
