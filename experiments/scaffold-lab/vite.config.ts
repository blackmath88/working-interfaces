import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@working-interfaces/scaffold': fileURLToPath(new URL('../../packages/scaffold/src/index.ts', import.meta.url)),
    },
  },
});
