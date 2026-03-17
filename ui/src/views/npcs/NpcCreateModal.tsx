// ui/src/views/npcs/NpcCreateModal.tsx — New NPC form modal

import { useState } from 'react';
import { atlas }    from '../../bridge/atlas';
import { Icon }     from '../../components/ui/Icon';
import type { NPC } from '../../types/npc';
import styles       from './NpcCreateModal.module.css';

interface Props {
  campaignId: string;
  onCreated:  (npc: NPC) => void;
  onClose:    () => void;
}

export function NpcCreateModal({ campaignId, onCreated, onClose }: Props) {
  const [name,   setName]   = useState('');
  const [alias,  setAlias]  = useState('');
  const [role,   setRole]   = useState('neutral');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

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
            disposition_towards_players, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'alive', 'neutral', '[]', ?, ?)`,
        [id, campaignId, name.trim(), alias.trim() || null, '', role, now, now],
      );
      const newNpc: NPC = {
        id, name: name.trim(), alias: alias.trim() || undefined, description: '',
        role: role as NPC['role'], vitalStatus: 'alive', dispositionTowardsPlayers: 'neutral',
        currentLocationId: null, locationIds: [], primaryFactionId: null, factionIds: [],
        relationships: [], questIds: [], sessionIds: [], plotThreadIds: [], notes: [],
        portraitAssetId: null, tags: [],
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
