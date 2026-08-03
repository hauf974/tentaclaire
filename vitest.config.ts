import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['{shared,server,client}/src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/src/engine/**/*.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 90,
      },
    },
  },
});
