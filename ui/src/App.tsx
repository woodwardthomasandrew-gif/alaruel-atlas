// ui/src/App.tsx — Root component and routing tree
//
// PERFORMANCE: Added <Suspense> boundary around the route tree so
// React.lazy() components can be displayed with a loading skeleton
// instead of blocking the initial render. Without Suspense, lazy()
// would throw an error; with it, the app shell appears immediately
// and individual modules stream in as their chunks download.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense }                                from 'react';
import { AppShell }               from './layouts/AppShell';
import { WelcomeView }            from './views/welcome/WelcomeView';
import { DashboardView }          from './views/dashboard/DashboardView';
import { useCampaignEvents }      from './hooks/useBridge';
import { useAppVersion }          from './hooks/useAppVersion';
import { useCampaignStore }       from './store/campaign.store';
import { MODULE_REGISTRY }        from './registry/module-registry';
import { ROUTES }                 from './router/routes';

// ── Module Loading Skeleton ───────────────────────────────────────────────────
//
// Shown while a module's JS chunk is being fetched + parsed.
// Keep this dead simple — no heavy dependencies, no async data.
// The skeleton disappears the moment the module finishes loading,
// and subsequent visits to the same module are instant (chunk cached).
function ModuleLoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      color: 'var(--text-muted, #888)',
      fontSize: '14px',
      gap: '10px',
    }}>
      {/* Simple spinner — no external dependencies */}
      <svg
        width="20" height="20" viewBox="0 0 20 20"
        style={{ animation: 'spin 1s linear infinite' }}
        aria-hidden
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle
          cx="10" cy="10" r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="25 15"
        />
      </svg>
      Loading module…
    </div>
  );
}

// ── Route Tree ────────────────────────────────────────────────────────────────

function AppRoutes() {
  const campaign = useCampaignStore(s => s.campaign);

  // Sync Electron push events → Zustand store
  useCampaignEvents();
  // Fetch app version on mount
  useAppVersion();

  return (
    // PERFORMANCE: <Suspense> is required for React.lazy() components.
    // It catches the "pending" promise thrown during the first render of
    // a lazy component and shows the fallback UI while the chunk loads.
    // Without this, the app would throw an unhandled error on first navigation.
    <Suspense fallback={<ModuleLoadingFallback />}>
      <Routes>
        {/* Welcome screen — no campaign required */}
        <Route path={ROUTES.welcome} element={<WelcomeView />} />

        {/* All routes below require the app shell (sidebar + layout) */}
        <Route element={<AppShell />}>
          <Route
            path={ROUTES.dashboard}
            element={campaign ? <DashboardView /> : <Navigate to={ROUTES.welcome} replace />}
          />
          {/* Module routes — redirect to welcome if no campaign open */}
          {MODULE_REGISTRY.map(entry => (
            <Route
              key={entry.id}
              path={entry.route}
              element={
                campaign
                  ? <entry.component />
                  : <Navigate to={ROUTES.welcome} replace />
              }
            />
          ))}
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.welcome} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
