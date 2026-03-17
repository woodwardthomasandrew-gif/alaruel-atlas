// =============================================================================
// apps/desktop/src/window.ts
//
// BrowserWindow factory and configuration.
//
// Centralises all window settings so main.ts stays clean.
// Security hardening follows Electron's recommended best practices:
//   - contextIsolation: true  — renderer cannot access Node.js APIs
//   - nodeIntegration: false  — no Node.js in renderer process
//   - sandbox: true           — renderer runs in OS sandbox
//   - preload script          — typed bridge exposed via contextBridge
// =============================================================================

import { BrowserWindow, shell } from 'electron';
import * as path                from 'node:path';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum window dimensions. Below this the layout breaks. */
const MIN_WIDTH  = 1024;
const MIN_HEIGHT = 768;

/** Default window dimensions on first launch. */
const DEFAULT_WIDTH  = 1440;
const DEFAULT_HEIGHT = 900;

// ── createMainWindow ──────────────────────────────────────────────────────────

/**
 * Construct and return the application's main BrowserWindow.
 *
 * The window is created hidden and shown only after the renderer signals
 * 'ready-to-show' — eliminates the white flash on startup.
 *
 * @param preloadPath - Absolute path to the compiled preload script.
 * @param rendererUrl - In development: Vite dev server URL.
 *                      In production: `undefined` (loads from dist/index.html).
 */
export function createMainWindow(
  preloadPath: string,
  rendererUrl?: string,
): BrowserWindow {
  const win = new BrowserWindow({
    width:       DEFAULT_WIDTH,
    height:      DEFAULT_HEIGHT,
    minWidth:    MIN_WIDTH,
    minHeight:   MIN_HEIGHT,
    // Start hidden — show in the 'ready-to-show' handler below.
    show:        false,
    // Native title bar on all platforms.
    titleBarStyle: 'default',
    title:       'Alaruel Atlas',
    // Application icon (resolved relative to the compiled output directory).
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    webPreferences: {
      // Security: no Node.js in the renderer process.
      nodeIntegration:  false,
      // Security: renderer runs in isolated context.
      contextIsolation: true,
      // Security: OS-level sandbox.
      sandbox:          true,
      // The only bridge between renderer and main: the preload script.
      preload:          preloadPath,
      // Disable experimental features not needed by the application.
      experimentalFeatures: false,
    },
  });

  // ── Load content ───────────────────────────────────────────────────────────

  if (rendererUrl) {
    // Development: Vite dev server
    win.loadURL(rendererUrl);
  } else {
    // Production: compiled renderer bundle
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // ── Show after paint ───────────────────────────────────────────────────────

  // Wait until the first frame is painted before showing to avoid flash.
  win.once('ready-to-show', () => {
    win.show();
  });

  // ── DevTools ───────────────────────────────────────────────────────────────

  if (process.env['NODE_ENV'] === 'development') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  // ── External link security ─────────────────────────────────────────────────

  // Intercept navigation and open external URLs in the system browser.
  // Prevents the renderer from navigating away from the app URL.
  win.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Only allow in-app navigation (file:// or the dev server origin).
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event: Electron.Event, url: string) => {
    const appUrl = rendererUrl ?? `file://${path.join(__dirname, '../renderer/')}`;
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

// ── Window state helpers ──────────────────────────────────────────────────────

/**
 * Return true if the window is usable (not destroyed, not minimised to tray).
 */
export function isWindowAvailable(win: BrowserWindow | null): win is BrowserWindow {
  return win !== null && !win.isDestroyed();
}

/**
 * Bring the window to focus, restoring it if minimised.
 */
export function focusWindow(win: BrowserWindow): void {
  if (win.isMinimized()) win.restore();
  win.focus();
}
