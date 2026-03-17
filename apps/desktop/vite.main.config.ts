import { defineConfig } from 'vite';
import * as path from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      // Mark EVERYTHING outside src/ as external
      // They get resolved at runtime by Node.js
      external: (id) => {
        if (id.startsWith('electron')) return true;
        if (id.startsWith('node:')) return true;
        if (id === 'better-sqlite3') return true;
        if (id.includes('/core/')) return true;
        if (id.includes('/modules/')) return true;
        if (id.includes('/shared/')) return true;
        return false;
      },
      output: {
        format: 'cjs',
        entryFileNames: '[name].js',
      },
    },
    outDir: '.vite/build',
    sourcemap: true,
    minify: false,
    emptyOutDir: false,
  },
});
