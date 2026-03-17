// ui/src/App.tsx — Root component and routing tree

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell }               from './layouts/AppShell';
import { WelcomeView }            from './views/welcome/WelcomeView';
import { DashboardView }          from './views/dashboard/DashboardView';
import { useCampaignEvents }      from './hooks/useBridge';
import { useAppVersion }          from './hooks/useAppVersion';
import { useCampaignStore }       from './store/campaign.store';
import { MODULE_REGISTRY }        from './registry/module-registry';
import { ROUTES }                 from './router/routes';

function AppRoutes() {
  const campaign = useCampaignStore(s => s.campaign);

  // Sync Electron push events → Zustand store
  useCampaignEvents();
  // Fetch app version on mount
  useAppVersion();

  return (
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
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
