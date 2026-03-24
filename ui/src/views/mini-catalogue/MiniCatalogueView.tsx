// ui/src/views/mini-catalogue/MiniCatalogueView.tsx
// Root Mini Catalogue view — list panel left, detail panel right.

import { useState, useEffect, useCallback } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { useCampaignStore } from '../../store/campaign.store';
import { atlas }            from '../../bridge/atlas';
import { MiniList }         from './MiniList';
import { MiniDetail }       from './MiniDetail';
import { MiniCreateModal }  from './MiniCreateModal';
import styles               from './MiniCatalogueView.module.css';

export interface MiniSummary {
  id:          string;
  name:        string;
  description: string;
  base_size:   string | null;
  quantity:    number;
  tags:        string; // raw JSON
}

const BASE_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

export default function MiniCatalogueView() {
  const campaign = useCampaignStore(s => s.campaign);

  const [minis,      setMinis]      = useState<MiniSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [creating,   setCreating]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await atlas.db.query<MiniSummary>(
        `SELECT id, name, description, base_size, quantity, tags
         FROM minis
         WHERE campaign_id = ?
         ORDER BY name ASC`,
        [campaign.id],
      );
      setMinis(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return atlas.on.moduleEvent(({ event }) => {
      if (event === 'mini-catalogue:created' || event === 'mini-catalogue:updated') {
        load();
      }
    });
  }, [load]);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = minis.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchSize   = !sizeFilter || m.base_size === sizeFilter;
    return matchSearch && matchSize;
  });

  // ── Callbacks ──────────────────────────────────────────────────────────────

  function handleCreated(id: string) {
    setCreating(false);
    load().then(() => setSelectedId(id));
  }

  function handleUpdated(updated: MiniSummary) {
    setMinis(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  function handleDeleted(id: string) {
    setMinis(prev => prev.filter(m => m.id !== id));
    setSelectedId(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>

      {/* Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Mini Catalogue</h2>
          <span className={styles.count}>{minis.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.createBtn} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            New Mini
          </button>
        </div>
      </header>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Icon name="box" size={13} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="text"
            placeholder="Search minis…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.filterLabel}>Base:</span>
        <select
          className={styles.filterSelect}
          value={sizeFilter}
          onChange={e => setSizeFilter(e.target.value)}
        >
          <option value="">All sizes</option>
          {BASE_SIZES.map(s => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
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
        <MiniList
          minis={filtered}
          loading={loading}
          selectedId={selectedId}
          onSelect={id => setSelectedId(id)}
        />
        <MiniDetail
          miniId={selectedId}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      </div>

      {creating && campaign && (
        <MiniCreateModal
          campaignId={campaign.id}
          onCreated={handleCreated}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
