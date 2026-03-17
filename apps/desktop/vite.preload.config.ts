import { defineConfig } from 'vite';
import * as path from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry:   path.resolve(__dirname, 'src/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        format: 'cjs',
        entryFileNames: '[name].js',
      },
    },
    outDir:      '.vite/build',
    sourcemap:   true,
    minify:      false,
    emptyOutDir: false,
  },
});