// ui/src/views/npcs/NpcsView.tsx
// Root NPC view — list panel + detail panel side-by-side

import { useState, useEffect, useCallback } from 'react';
import { Icon }               from '../../components/ui/Icon';
import { useCampaignStore }   from '../../store/campaign.store';
import { atlas }              from '../../bridge/atlas';
import type { NPC }           from '../../types/npc';
import { NpcList }            from './NpcList';
import { NpcDetail }          from './NpcDetail';
import { NpcCreateModal }     from './NpcCreateModal';
import styles                 from './NpcsView.module.css';

export default function NpcsView() {
  const campaign                 = useCampaignStore(s => s.campaign);
  const [npcs,     setNpcs]      = useState<NPC[]>([]);
  const [selected, setSelected]  = useState<NPC | null>(null);
  const [loading,  setLoading]   = useState(true);
  const [search,   setSearch]    = useState('');
  const [creating, setCreating]  = useState(false);
  const [error,    setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await atlas.db.query<NPC>(
        `SELECT * FROM npcs WHERE campaign_id = ? ORDER BY name ASC`,
        [campaign.id],
      );
      // Parse JSON tags field
      const parsed: NPC[] = rows.map(r => {
        const raw = r as unknown as Record<string, unknown>;
        return {
          ...r,
          tags:  typeof r.tags === 'string' ? JSON.parse(r.tags as unknown as string) as string[] : (r.tags ?? []),
          vitalStatus:               ((raw['vital_status'] ?? r.vitalStatus ?? 'alive') as NPC['vitalStatus']),
          dispositionTowardsPlayers: ((raw['disposition_towards_players'] ?? r.dispositionTowardsPlayers ?? 'neutral') as NPC['dispositionTowardsPlayers']),
          currentLocationId:         (raw['current_location_id'] ?? r.currentLocationId ?? null) as string | null,
          primaryFactionId:          (raw['primary_faction_id'] ?? r.primaryFactionId ?? null) as string | null,
          portraitAssetId:           (raw['portrait_asset_id'] ?? r.portraitAssetId ?? null) as string | null,
          createdAt:                 ((raw['created_at'] ?? r.createdAt) as NPC['createdAt']),
          updatedAt:                 ((raw['updated_at'] ?? r.updatedAt) as NPC['updatedAt']),
          notes: [], questIds: [], sessionIds: [], plotThreadIds: [],
          locationIds: [], factionIds: [], relationships: [],
        };
      });
      setNpcs(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  // Listen for module events pushed from main process
  useEffect(() => {
    const unsub = atlas.on.moduleEvent(({ event }) => {
      if (event === 'npc:created' || event === 'npc:updated') load();
    });
    return unsub;
  }, [load]);

  const filtered = search
    ? npcs.filter(n =>
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        (n.alias ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : npcs;

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Characters</h2>
          <span className={styles.count}>{npcs.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.searchWrap}>
            <Icon name="users" size={14} className={styles.searchIcon} />
            <input
              className={styles.search}
              type="text"
              placeholder="Search characters…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className={styles.createBtn} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            New NPC
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} /> {error}
        </div>
      )}

      {/* Split layout */}
      <div className={styles.body}>
        <NpcList
          npcs={filtered}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
        />
        <NpcDetail
          npc={selected}
          onUpdated={updated => {
            setNpcs(prev => prev.map(n => n.id === updated.id ? updated : n));
            setSelected(updated);
          }}
          onDeleted={id => {
            setNpcs(prev => prev.filter(n => n.id !== id));
            setSelected(null);
          }}
        />
      </div>

      {creating && (
        <NpcCreateModal
          campaignId={campaign!.id}
          onCreated={npc => { setNpcs(prev => [...prev, npc]); setCreating(false); }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
