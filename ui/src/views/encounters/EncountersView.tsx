import { useState, useEffect, useCallback } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type { Encounter, EncounterStatus, EncounterType } from '../../types/encounter';
import { EncounterList }        from './EncounterList';
import { EncounterDetail }      from './EncounterDetail';
import { EncounterCreateModal } from './EncounterCreateModal';
import styles                   from './EncountersView.module.css';

const STATUS_FILTERS: (EncounterStatus | 'all')[] = ['all', 'planned', 'ready', 'run', 'archived'];

function rowToEncounter(r: Record<string, unknown>): Encounter {
  return {
    id:               r['id'] as string,
    name:             r['name'] as string,
    description:      r['description'] as string ?? '',
    encounterType:    r['encounter_type'] as EncounterType,
    status:           r['status'] as EncounterStatus,
    sessionNumber:    r['session_number'] as number | undefined,
    sessionId:        r['session_id'] as string | null,
    dungeonRoomId:    r['dungeon_room_id'] as string | null,
    location:         r['location'] as string ?? '',
    difficulty:       r['difficulty'] as Encounter['difficulty'],
    tags:             JSON.parse(r['tags'] as string ?? '[]'),
    notes:            r['notes'] as string ?? '',

    partyId:          r['party_id'] as string | null,
    partyLevel:       r['party_level'] as number | null,
    airshipPresent:   r['airship_present'] === 1,
    partyNotes:       r['party_notes'] as string ?? '',

    battleMapAssetId: r['battle_map_asset_id'] as string | null,
    mapNotes:         r['map_notes'] as string ?? '',
    terrainNotes:     r['terrain_notes'] as string ?? '',

    environmentalEffects: JSON.parse(r['environmental_effects'] as string ?? '[]'),
    legendaryActions:     JSON.parse(r['legendary_actions'] as string ?? '[]'),
    lairActions:          JSON.parse(r['lair_actions'] as string ?? '[]'),
    conditions:           JSON.parse(r['conditions'] as string ?? '[]'),

    loot:              r['loot'] as string ?? '',
    xpAward:           r['xp_award'] as number | null,
    storyRewards:      r['story_rewards'] as string ?? '',
    reputationRewards: r['reputation_rewards'] as string ?? '',
    rewardNotes:       r['reward_notes'] as string ?? '',

    createdAt: r['created_at'] as string,
    updatedAt: r['updated_at'] as string,
  };
}

export default function EncountersView() {
  const campaign                    = useCampaignStore(s => s.campaign);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState<EncounterStatus | 'all'>('all');
  const [creating,   setCreating]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await atlas.db.query<Record<string, unknown>>(
        'SELECT * FROM encounters WHERE campaign_id = ? ORDER BY updated_at DESC',
        [campaign.id],
      );
      setEncounters(rows.map(rowToEncounter));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setLoading(false); }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = atlas.on.moduleEvent(({ event }) => {
      if (event.startsWith('encounter:')) load();
    });
    return unsub;
  }, [load]);

  const filtered = encounters.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = encounters.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  const selected = encounters.find(e => e.id === selectedId) ?? null;

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Encounter Workspace</h2>
          <span className={styles.count}>{encounters.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <input className={styles.search} placeholder="Search encounters…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className={styles.createBtn} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New Encounter
          </button>
        </div>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={15}/> {error}</div>}

      <div className={styles.filters}>
        {STATUS_FILTERS.map(s => (
          <button key={s}
            className={`${styles.filterBtn} ${filter === s ? styles.active : ''}`}
            onClick={() => setFilter(s)}>
            {s === 'all' ? `All (${encounters.length})` : `${s} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <EncounterList encounters={filtered} loading={loading}
          selectedId={selectedId} onSelect={id => setSelectedId(id)} />
        <EncounterDetail
          encounterId={selected?.id ?? null}
          campaignId={campaign?.id ?? ''}
          onDeleted={() => { setSelectedId(null); load(); }}
          onChanged={load}
        />
      </div>

      {creating && campaign && (
        <EncounterCreateModal campaignId={campaign.id}
          onCreated={enc => { setEncounters(prev => [enc, ...prev]); setSelectedId(enc.id); setCreating(false); }}
          onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
