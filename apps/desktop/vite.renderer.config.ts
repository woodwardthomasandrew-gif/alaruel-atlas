import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';

const desktopDir = __dirname;
const uiDir = path.resolve(desktopDir, '../../ui');
const desktopModules = path.resolve(desktopDir, 'node_modules');

export default defineConfig({
  plugins: [react()],
  base: './',
  root: uiDir,
  resolve: {
    alias: {
      '@': path.resolve(uiDir, 'src'),
    },
    // Look in desktop/node_modules for React etc
    modules: [desktopModules, 'node_modules'],
    dedupe: ['react', 'react-dom', 'react-router-dom', 'zustand'],
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [uiDir, desktopDir, path.resolve(desktopDir, '../..')],
    },
  },
  build: {
    outDir: path.resolve(desktopDir, '.vite/renderer/main_window'),
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom', 'zustand'],
  },
});
