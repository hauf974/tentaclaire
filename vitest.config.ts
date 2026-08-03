import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['{shared,server,client}/src/**/*.{test,spec}.ts'],
  },
});
