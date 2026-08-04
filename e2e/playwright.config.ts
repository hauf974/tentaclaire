import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: './tests',
  // Un seul serveur applicatif partagé par toute la suite (état en mémoire,
  // T4) : jamais de parallélisme entre tests, sous peine d'interférences
  // (config/partie modifiées par un scénario pendant qu'un autre l'observe).
  fullyParallel: false,
  workers: 1,
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
