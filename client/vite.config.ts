import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const serverTarget = `http://localhost:${process.env.SERVER_PORT ?? 3000}`;

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': serverTarget,
      '/socket.io': {
        target: serverTarget,
        ws: true,
      },
    },
  },
});
