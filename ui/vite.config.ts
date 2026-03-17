// ui/vite.config.ts — Vite config for the React renderer process
import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import * as path        from 'node:path';

export default defineConfig({
  plugins: [react()],
  base:    './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir:    '../apps/desktop/.vite/renderer/main_window',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
