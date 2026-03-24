// ui/src/views/mini-catalogue/MiniDetail.tsx
// Right-side detail + inline editor for a selected mini.

import { useState, useEffect } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { useCampaignStore } from '../../store/campaign.store';
import { atlas }            from '../../bridge/atlas';
import type { MiniSummary } from './MiniCatalogueView';
import styles               from './MiniDetail.module.css';

const BASE_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const;

// ── Local types ───────────────────────────────────────────────────────────────

interface MiniRow {
  id:          string;
  name:        string;
  description: string;
  base_size:   string | null;
  quantity:    number;
  tags:        string;
}

interface MonsterLink  { monster_id: string; name: string; }
interface MonsterOption { id: string; name: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  miniId:    string | null;
  onUpdated: (updated: MiniSummary) => void;
  onDeleted: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MiniDetail({ miniId, onUpdated, onDeleted }: Props) {
  const campaign = useCampaignStore(s => s.campaign);

  const [mini,           setMini]           = useState<MiniRow | null>(null);
  const [linkedMonsters, setLinkedMonsters] = useState<MonsterLink[]>([]);
  const [allMonsters,    setAllMonsters]    = useState<MonsterOption[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [editing,        setEditing]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // Form fields
  const [formName,     setFormName]     = useState('');
  const [formDesc,     setFormDesc]     = useState('');
  const [formBaseSize, setFormBaseSize] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formTags,     setFormTags]     = useState('');

  // ── Load mini ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!miniId) {
      setMini(null); setLinkedMonsters([]);
      setEditing(false); setConfirmDelete(false);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([
      atlas.db.query<MiniRow>('SELECT * FROM minis WHERE id = ?', [miniId]),
      atlas.db.query<MonsterLink>(
        `SELECT m.id AS monster_id, m.name
         FROM monsters m JOIN mini_monsters mm ON mm.monster_id = m.id
         WHERE mm.mini_id = ? ORDER BY m.name ASC`,
        [miniId],
      ),
    ]).then(([miniRows, monsterRows]) => {
      const m = miniRows[0] ?? null;
      setMini(m);
      setLinkedMonsters(monsterRows);
      if (m) {
        setFormName(m.name);
        setFormDesc(m.description);
        setFormBaseSize(m.base_size ?? '');
        setFormQuantity(m.quantity ?? 1);
        setFormTags(parseTags(m.tags).join(', '));
      }
      setEditing(false);
      setConfirmDelete(false);
    }).catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [miniId]);

  // ── Load all monsters when entering edit mode ─────────────────────────────

  useEffect(() => {
    if (!editing || !campaign) return;
    atlas.db.query<MonsterOption>(
      `SELECT id, name FROM monsters WHERE campaign_id = ? ORDER BY name ASC`,
      [campaign.id],
    ).then(setAllMonsters).catch(() => {});
  }, [editing, campaign]);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!mini || !miniId) return;
    const trimmedName = formName.trim();
    if (!trimmedName) { setError('Name is required.'); return; }
    const qty  = Math.max(1, Math.floor(formQuantity) || 1);
    const tags = formTags.split(',').map(t => t.trim()).filter(Boolean);

    setSaving(true); setError(null);
    try {
      await atlas.db.run(
        `UPDATE minis
         SET name=?, description=?, base_size=?, quantity=?, tags=?,
             updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id=?`,
        [trimmedName, formDesc, formBaseSize || null, qty, JSON.stringify(tags), miniId],
      );
      const updatedRow: MiniRow = { ...mini, name: trimmedName, description: formDesc, base_size: formBaseSize || null, quantity: qty, tags: JSON.stringify(tags) };
      setMini(updatedRow);
      onUpdated({ id: miniId, name: trimmedName, description: formDesc, base_size: formBaseSize || null, quantity: qty, tags: JSON.stringify(tags) });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!miniId) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await atlas.db.run('DELETE FROM minis WHERE id=?', [miniId]);
      onDeleted(miniId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfirmDelete(false);
    }
  }

  // ── Monster linking ───────────────────────────────────────────────────────

  async function handleLinkMonster(monsterId: string) {
    if (!miniId || !monsterId) return;
    await atlas.db.run('INSERT OR IGNORE INTO mini_monsters (mini_id, monster_id) VALUES (?,?)', [miniId, monsterId]);
    const rows = await atlas.db.query<MonsterLink>(
      `SELECT m.id AS monster_id, m.name FROM monsters m JOIN mini_monsters mm ON mm.monster_id=m.id WHERE mm.mini_id=? ORDER BY m.name ASC`,
      [miniId],
    );
    setLinkedMonsters(rows);
  }

  async function handleUnlinkMonster(monsterId: string) {
    if (!miniId) return;
    await atlas.db.run('DELETE FROM mini_monsters WHERE mini_id=? AND monster_id=?', [miniId, monsterId]);
    setLinkedMonsters(prev => prev.filter(m => m.monster_id !== monsterId));
  }

  // ── Empty / loading states ────────────────────────────────────────────────

  if (!miniId) return (
    <div className={styles.empty}>
      <Icon name="box" size={40} className={styles.emptyIcon} />
      <p>Select a mini to view details</p>
    </div>
  );

  if (loading) return (
    <div className={styles.empty}>
      <Icon name="loader" size={24} className={styles.spin} />
    </div>
  );

  if (!mini) return (
    <div className={styles.empty}><p>Mini not found.</p></div>
  );

  const linkedIds  = new Set(linkedMonsters.map(m => m.monster_id));
  const unlinkable = allMonsters.filter(m => !linkedIds.has(m.id));
  const displayTags = parseTags(mini.tags);
  const qty = mini.quantity ?? 1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.panel}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>{mini.name.slice(0,1).toUpperCase()}</div>
          <div>
            <div className={styles.name}>{mini.name}</div>
            <div className={styles.pills}>
              {mini.base_size && (
                <span className={styles.sizePill}>
                  {mini.base_size.charAt(0).toUpperCase() + mini.base_size.slice(1)}
                </span>
              )}
              <span className={styles.qtyPill} title="Quantity owned">
                ×{qty}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {!editing ? (
            <>
              <button className={styles.editBtn} onClick={() => { setEditing(true); setConfirmDelete(false); }}>
                <Icon name="edit" size={14} /> Edit
              </button>
              <button
                className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnConfirm : ''}`}
                onClick={handleDelete}
              >
                {confirmDelete ? 'Click again to confirm' : <><Icon name="trash" size={14} /> Delete</>}
              </button>
            </>
          ) : (
            <>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className={styles.cancelBtn} onClick={() => { setEditing(false); setConfirmDelete(false); }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className={styles.error}><Icon name="alert" size={14} /> {error}</div>}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className={styles.body}>

        {editing ? (
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Base Size</label>
                <select className={styles.select} value={formBaseSize} onChange={e => setFormBaseSize(e.target.value)}>
                  <option value="">— none —</option>
                  {BASE_SIZES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Quantity</label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={999}
                  value={formQuantity}
                  onChange={e => setFormQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea className={styles.textarea} rows={3} value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Physical appearance, paint scheme, manufacturer…" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tags <span className={styles.hint}>(comma-separated)</span></label>
              <input className={styles.input} value={formTags} onChange={e => setFormTags(e.target.value)}
                placeholder="painted, undead, reaper…" />
            </div>
          </div>
        ) : (
          <>
            {mini.description && <p className={styles.description}>{mini.description}</p>}
            {displayTags.length > 0 && (
              <div className={styles.tags}>
                {displayTags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
              </div>
            )}
          </>
        )}

        {/* ── Linked Monsters ─────────────────────────────────────────────── */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Linked Monsters</h4>

          {linkedMonsters.length === 0 ? (
            <p className={styles.emptyText}>No monsters linked yet.</p>
          ) : (
            <ul className={styles.linkList}>
              {linkedMonsters.map(m => (
                <li key={m.monster_id} className={styles.linkItem}>
                  <Icon name="skull" size={13} className={styles.linkIcon} />
                  <span>{m.name}</span>
                  <button className={styles.unlinkBtn} onClick={() => handleUnlinkMonster(m.monster_id)} title="Unlink">✕</button>
                </li>
              ))}
            </ul>
          )}

          {editing && unlinkable.length > 0 && (
            <div className={styles.formGroup} style={{ marginTop: '.85rem' }}>
              <label className={styles.label}>Link a Monster</label>
              <select className={styles.select} defaultValue=""
                onChange={e => { if (e.target.value) { handleLinkMonster(e.target.value); e.target.value = ''; } }}>
                <option value="">— select monster to link —</option>
                {unlinkable.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          {editing && unlinkable.length === 0 && allMonsters.length > 0 && (
            <p className={styles.emptyText} style={{ marginTop: '.5rem' }}>All monsters are already linked.</p>
          )}
        </div>
      </div>
    </div>
  );
}
