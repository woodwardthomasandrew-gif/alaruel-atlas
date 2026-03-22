// ═══════════════════════════════════════════════════════════════════════════
//  EXISTING FILE EDITS — Crystal Ball integration
//  These are the only changes needed to existing files.
//  Everything else is in new files that require no edits to the codebase.
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// 1. ui/src/bridge/atlas.ts
//    Add the inspiration namespace to the renderer bridge object.
//    Find the export const atlas = { ... } block and add one line:
// ───────────────────────────────────────────────────────────────────────────

/*
  BEFORE (excerpt):
  ─────────────────
  export const atlas = {
    db: { ... },
    assets: { ... },
    // ... other namespaces
  };

  AFTER:
  ──────
  import { inspirationBridge } from './atlas.inspiration';   // ← ADD

  export const atlas = {
    db: { ... },
    assets: { ... },
    // ... other namespaces
    inspiration: inspirationBridge,                          // ← ADD
  };
*/

// ───────────────────────────────────────────────────────────────────────────
// 2. apps/desktop/src/ipc.ts  (or wherever module handlers are bootstrapped)
//    Register the inspiration IPC handler alongside the other module handlers.
//    Find the function that calls registerAssetHandlers() et al., and add:
// ───────────────────────────────────────────────────────────────────────────

/*
  BEFORE (excerpt from the handler registration block):
  ─────────────────────────────────────────────────────
  registerAssetHandlers(paths);
  // ... other registerXxxHandlers calls

  AFTER:
  ──────
  import { registerInspirationHandlers } from '../../../modules/inspiration/index';

  registerAssetHandlers(paths);
  registerInspirationHandlers({ db: databaseManager, log });   // ← ADD
  // ... other registerXxxHandlers calls
*/

// ───────────────────────────────────────────────────────────────────────────
// 3. ui/src/App.tsx  (or wherever the nav routes are declared)
//    Add the Inspiration route so the view is reachable from the sidebar.
//    The exact shape depends on your router; here's the typical pattern
//    based on the existing view registrations:
// ───────────────────────────────────────────────────────────────────────────

/*
  BEFORE (excerpt — existing route entries):
  ───────────────────────────────────────────
  import AtlasView      from './views/atlas/AtlasView';
  import SessionsView   from './views/sessions/SessionsView';
  // ... other view imports

  const VIEWS = [
    { id: 'atlas',    label: 'Atlas',    icon: 'map',    component: AtlasView },
    { id: 'sessions', label: 'Sessions', icon: 'scroll', component: SessionsView },
    // ...
  ];

  AFTER:
  ──────
  import InspirationView from './views/inspiration/InspirationView';   // ← ADD

  const VIEWS = [
    { id: 'atlas',       label: 'Atlas',       icon: 'map',      component: AtlasView },
    { id: 'sessions',    label: 'Sessions',    icon: 'scroll',   component: SessionsView },
    { id: 'inspiration', label: 'Inspiration', icon: 'sparkles', component: InspirationView },  // ← ADD
    // ...
  ];
*/

export {}; // makes TypeScript treat this as a module
