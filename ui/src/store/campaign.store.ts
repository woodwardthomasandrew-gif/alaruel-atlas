// ui/src/store/campaign.store.ts
//
// Global Zustand store for the active campaign and application state.
// All mutations go through the actions defined here — never setState directly.

import { create } from 'zustand';

export type AppStatus = 'idle' | 'opening' | 'creating' | 'ready' | 'error';

export interface CampaignMeta {
  id:       string;
  name:     string;
  filePath: string;
}

interface CampaignState {
  // ── State ───────────────────────────────────────────────────────────────────
  status:           AppStatus;
  campaign:         CampaignMeta | null;
  error:            string | null;
  appVersion:       string;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setCampaignOpen:  (meta: CampaignMeta) => void;
  setCampaignClosed: () => void;
  setStatus:        (status: AppStatus) => void;
  setError:         (error: string | null) => void;
  setAppVersion:    (v: string) => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  status:    'idle',
  campaign:  null,
  error:     null,
  appVersion: '0.1.0',

  setCampaignOpen:  (meta)    => set({ campaign: meta, status: 'ready', error: null }),
  setCampaignClosed: ()       => set({ campaign: null, status: 'idle',  error: null }),
  setStatus:        (status)  => set({ status }),
  setError:         (error)   => set({ error, status: error ? 'error' : 'idle' }),
  setAppVersion:    (v)       => set({ appVersion: v }),
}));
