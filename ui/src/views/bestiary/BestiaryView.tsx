// ui/src/views/bestiary/BestiaryView.tsx
// Root bestiary view — list panel + statblock detail panel side-by-side.

import { useState, useEffect, useCallback } from 'react';
import { Icon }                from '../../components/ui/Icon';
import { useCampaignStore }    from '../../store/campaign.store';
import { atlas }               from '../../bridge/atlas';
import { MonsterList }         from './MonsterList';
import type { MonsterSummary } from './MonsterList';
import { MonsterDetail }       from './MonsterDetail';
import { MonsterCreateModal }  from './MonsterCreateModal';
import styles                  from './BestiaryView.module.css';

const CREATURE_TYPES = [
  'aberration','beast','celestial','construct','dragon','elemental',
  'fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead','custom',
];

// Raw shape returned by the list query
interface MonsterRow {
  id:               string;
  name:             string;
  creature_type:    string;
  size:             string;
  challenge_rating: string;
  is_homebrew:      number;
}

export default function BestiaryView() {
  const campaign = useCampaignStore(s => s.campaign);

  const [monsters,    setMonsters]    = useState<MonsterSummary[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Load monsters from DB ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await atlas.db.query<MonsterRow>(
        `SELECT id, name, creature_type, size, challenge_rating, is_homebrew
         FROM monsters
         WHERE campaign_id = ?
         ORDER BY name ASC`,
        [campaign.id],
      );
      setMonsters(rows.map(r => ({
        id:              r.id,
        name:            r.name,
        creatureType:    r.creature_type,
        size:            r.size,
        challengeRating: r.challenge_rating,
        isHomebrew:      r.is_homebrew === 1,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  // Listen for push events from main process
  useEffect(() => {
    const unsub = atlas.on.moduleEvent(({ event }) => {
      if (event === 'bestiary:created' || event === 'bestiary:updated') load();
    });
    return unsub;
  }, [load]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = monsters.filter(m => {
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || m.creatureType === typeFilter;
    return matchSearch && matchType;
  });

  // ── Create callback ─────────────────────────────────────────────────────────
  function handleCreated(id: string, name: string) {
    setCreating(false);
    load().then(() => setSelectedId(id));
  }

  // ── Updated / deleted callbacks ─────────────────────────────────────────────
  function handleUpdated(id: string, name: string, cr: string) {
    setMonsters(prev => prev.map(m =>
      m.id === id ? { ...m, name, challengeRating: cr } : m
    ));
  }

  function handleDeleted(id: string) {
    setMonsters(prev => prev.filter(m => m.id !== id));
    setSelectedId(null);
  }

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Bestiary</h2>
          <span className={styles.count}>{monsters.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.createBtn} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            New Monster
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Icon name="skull" size={13} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="text"
            placeholder="Search monsters…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.filterLabel}>Type:</span>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">All</option>
          {CREATURE_TYPES.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} /> {error}
        </div>
      )}

      {/* Split layout */}
      <div className={styles.body}>
        <MonsterList
          monsters={filtered}
          loading={loading}
          selected={filtered.find(m => m.id === selectedId) ?? null}
          onSelect={m => setSelectedId(m.id)}
        />
        <MonsterDetail
          monsterId={selectedId}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      </div>

      {creating && campaign && (
        <MonsterCreateModal
          campaignId={campaign.id}
          onCreated={handleCreated}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
