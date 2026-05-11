// ui/vite.config.ts — Vite config for the React renderer process
//
// PERFORMANCE CHANGES:
//
// 1. manualChunks: Splits the bundle so each module view has its own
//    chunk file. Without this, Rollup might still bundle everything
//    together even with React.lazy(). With explicit chunks, each module
//    is guaranteed to be a separate file that only loads on first visit.
//
//    Chunk strategy:
//    - 'vendor-react'  : React + React-DOM (rarely changes, long cache TTL)
//    - 'vendor-router' : React Router (rarely changes)
//    - Per-module chunks: each heavy view in its own file
//
// 2. chunkSizeWarningLimit: Raised to 800kB so the vendor chunk doesn't
//    spam warnings (it's expected to be large and cached aggressively).
//
// 3. rollupOptions.output.compact: Slightly better minification.

import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import * as path        from 'node:path';

// Uncomment to enable bundle size visualization (run: pnpm build then open stats.html):
// import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // visualizer({ open: false, filename: 'stats.html', gzipSize: true }),
  ],
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
    // Raised from default 500kB — vendor bundles are large by nature
    // and are cached separately from app code.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // PERFORMANCE: Manual chunk splitting ensures React.lazy() boundaries
        // produce genuinely separate files. Without manualChunks, Rollup's
        // heuristics may still merge modules that share dependencies.
        manualChunks(id) {
          // Vendor: React core — changes infrequently, cache forever
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Vendor: Router — separate chunk so route changes don't bust React cache
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run')) {
            return 'vendor-router';
          }
          // Vendor: Zustand state management
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }

          // Per-module chunks: each view that is React.lazy()'d gets its own file.
          // The key is the module name; the value is a string that becomes the
          // chunk filename. This makes it easy to see in DevTools which chunk
          // a slow network request corresponds to.
          const moduleViews: [string, string][] = [
            ['views/graph/',         'module-graph'],
            ['views/dungeon/',       'module-dungeon'],
            ['views/sessions/',      'module-sessions'],
            ['views/timeline/',      'module-timeline'],
            ['views/bestiary/',      'module-bestiary'],
            ['views/party/',         'module-party'],
            ['views/npcs/',          'module-npcs'],
            ['views/factions/',      'module-factions'],
            ['views/quests/',        'module-quests'],
            ['views/atlas/',         'module-atlas'],
            ['views/generators/',    'module-generators'],
            ['views/inspiration/',   'module-inspiration'],
            ['views/mini-catalogue/', 'module-mini-catalogue'],
            ['views/assets/',        'module-assets'],
          ];

          for (const [pathFragment, chunkName] of moduleViews) {
            if (id.includes(pathFragment)) return chunkName;
          }

          // Everything else (shared utils, types, stores) stays in the main chunk.
          // This is intentional: shared code should be in one place, not duplicated
          // across module chunks.
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
