
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const desktopDir = __dirname;

async function main() {
  // Step 1: Build main process and preload with esbuild
  console.log('[dev] Building main process...');
  execSync('node build-main.cjs', { cwd: desktopDir, stdio: 'inherit' });

  // Step 2: Start Vite renderer dev server
  console.log('[dev] Starting Vite renderer dev server...');
  const vite = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--config', 'vite.renderer.config.ts', '--port', '5173'],
    { cwd: desktopDir, stdio: 'inherit' }
  );

  // Step 3: Wait for Vite to be ready then launch Electron
  console.log('[dev] Waiting for Vite to start...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('[dev] Launching Electron...');
  const electron = spawn(
    path.join(desktopDir, 'node_modules/electron/dist/electron.exe'),
    ['.'],
    { cwd: desktopDir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } }
  );

  electron.on('close', (code) => {
    console.log('[dev] Electron exited with code', code);
    vite.kill();
    process.exit(code);
  });

  process.on('SIGINT', () => {
    electron.kill();
    vite.kill();
    process.exit(0);
  });
}

main().catch(e => {
  console.error('[dev] Error:', e.message);
  process.exit(1);
});
