// ui/src/views/npcs/NpcCreateModal.tsx — New NPC form modal

import { useState, useEffect } from 'react';
import { atlas }    from '../../bridge/atlas';
import { Icon }     from '../../components/ui/Icon';
import type { NPC } from '../../types/npc';
import styles       from './NpcCreateModal.module.css';

interface Props {
  campaignId: string;
  onCreated:  (npc: NPC) => void;
  onClose:    () => void;
}

interface PortraitAsset { id: string; name: string; }

export function NpcCreateModal({ campaignId, onCreated, onClose }: Props) {
  const [name,            setName]            = useState('');
  const [alias,           setAlias]           = useState('');
  const [role,            setRole]            = useState('neutral');
  const [portraitAssetId, setPortraitAssetId] = useState('');
  const [portraitAssets,  setPortraitAssets]  = useState<PortraitAsset[]>([]);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  useEffect(() => {
    atlas.db.query<{ id: string; name: string }>(
      "SELECT id, name FROM assets WHERE campaign_id=? AND category='portraits' ORDER BY name ASC",
      [campaignId],
    ).then(setPortraitAssets).catch(() => {});
  }, [campaignId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await atlas.db.run(
        `INSERT INTO npcs
           (id, campaign_id, name, alias, description, role, vital_status,
            disposition_towards_players, portrait_asset_id, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'alive', 'neutral', ?, '[]', ?, ?)`,
        [id, campaignId, name.trim(), alias.trim() || null, '', role,
         portraitAssetId || null, now, now],
      );
      const newNpc: NPC = {
        id, name: name.trim(), alias: alias.trim() || undefined, description: '',
        role: role as NPC['role'], vitalStatus: 'alive', dispositionTowardsPlayers: 'neutral',
        currentLocationId: null, locationIds: [], primaryFactionId: null, factionIds: [],
        relationships: [], questIds: [], sessionIds: [], plotThreadIds: [], notes: [],
        portraitAssetId: portraitAssetId || null,
        tags: [],
        createdAt: now as NPC['createdAt'], updatedAt: now as NPC['updatedAt'],
      };
      onCreated(newNpc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h3>New Character</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </header>

        {error && <div className={styles.errorBar}><Icon name="alert" size={14}/> {error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Name <span className={styles.required}>*</span>
            <input
              className={styles.input}
              autoFocus
              placeholder="Elara Brightmantle…"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Alias / Title
            <input
              className={styles.input}
              placeholder="Optional"
              value={alias}
              onChange={e => setAlias(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Role
            <select className={styles.input} value={role}
              onChange={e => setRole(e.target.value)}>
              {['ally','antagonist','neutral','informant','questgiver','merchant','recurring','minor']
                .map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </label>

          <label className={styles.label}>
            Portrait <span className={styles.optional}>(optional)</span>
            <select className={styles.input} value={portraitAssetId}
              onChange={e => setPortraitAssetId(e.target.value)}>
              <option value="">— No portrait —</option>
              {portraitAssets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {portraitAssets.length === 0 && (
              <span className={styles.hint}>
                No portrait images yet. Import one under Assets → portraits first.
              </span>
            )}
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving || !name.trim()}>
              {saving ? <Icon name="loader" size={15} className={styles.spin} /> : <Icon name="plus" size={15} />}
              Create Character
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
