
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const desktopDir = __dirname;

const baseConfig = {
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  bundle: true,
  sourcemap: true,
  external: ['electron', 'better-sqlite3'],
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
};

async function build() {
  const outDir = path.join(desktopDir, '.vite', 'build');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('[build] Bundling main process...');
  await esbuild.build({
    ...baseConfig,
    entryPoints: [path.join(desktopDir, 'src', 'main.ts')],
    outfile: path.join(outDir, 'main.js'),
  });
  console.log('[build] main.js done');

  console.log('[build] Bundling preload...');
  await esbuild.build({
    ...baseConfig,
    entryPoints: [path.join(desktopDir, 'src', 'preload.ts')],
    outfile: path.join(outDir, 'preload.js'),
  });
  console.log('[build] preload.js done');

  console.log('[build] Complete!');
}

build().catch(e => {
  console.error('[build] FAILED:', e.message);
  process.exit(1);
});
