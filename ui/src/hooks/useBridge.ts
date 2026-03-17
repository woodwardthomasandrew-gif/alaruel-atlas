// ui/src/hooks/useBridge.ts
//
// React hooks for common IPC operations.
// Handles loading state, error state, and cleanup automatically.

import { useState, useCallback, useEffect } from 'react';
import { atlas }                             from '../bridge/atlas';
import { useCampaignStore }                  from '../store/campaign.store';

// ── useOpenCampaign ───────────────────────────────────────────────────────────

export function useOpenCampaign() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const { setCampaignOpen, setStatus } = useCampaignStore();

  const openCampaign = useCallback(async (dbPath: string) => {
    setLoading(true);
    setError(null);
    setStatus('opening');
    try {
      const result = await atlas.campaign.open(dbPath);
      if (!result.ok) throw new Error(result.error ?? 'Unknown error');
      setCampaignOpen({ id: result.campaignId!, name: '', filePath: dbPath });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [setCampaignOpen, setStatus]);

  return { openCampaign, loading, error };
}

// ── useCreateCampaign ─────────────────────────────────────────────────────────

interface CreateOptions { name: string; gmName?: string; system?: string; }

export function useCreateCampaign() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const { setCampaignOpen, setStatus } = useCampaignStore();

  const createCampaign = useCallback(async (opts: CreateOptions) => {
    setLoading(true);
    setError(null);
    setStatus('creating');
    try {
      const filePath = await atlas.campaign.saveFile(opts.name);
      if (!filePath) { setLoading(false); setStatus('idle'); return; }
      const result = await atlas.campaign.create({ ...opts, filePath });
      if (!result.ok) throw new Error(result.error ?? 'Unknown error');
      setCampaignOpen({ id: result.campaignId!, name: opts.name, filePath });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [setCampaignOpen, setStatus]);

  return { createCampaign, loading, error };
}

// ── useRecentCampaigns ────────────────────────────────────────────────────────

export function useRecentCampaigns() {
  const [recent,  setRecent]  = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    atlas.campaign.listRecent()
      .then(list => setRecent(list.map(r => r.filePath)))
      .catch(() => setRecent([]))
      .finally(() => setLoading(false));
  }, []);

  return { recent, loading };
}

// ── useCampaignEvents ─────────────────────────────────────────────────────────

/** Sync Electron push events into the Zustand store. */
export function useCampaignEvents() {
  const { setCampaignOpen, setCampaignClosed } = useCampaignStore();

  useEffect(() => {
    const unsubOpen   = atlas.on.campaignOpened((id) => {
      setCampaignOpen({ id, name: '', filePath: '' });
    });
    const unsubClosed = atlas.on.campaignClosed(() => {
      setCampaignClosed();
    });
    return () => { unsubOpen(); unsubClosed(); };
  }, [setCampaignOpen, setCampaignClosed]);
}
