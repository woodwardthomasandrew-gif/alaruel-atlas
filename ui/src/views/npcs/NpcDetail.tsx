// ui/src/views/npcs/NpcDetail.tsx — NPC detail / edit panel

import { useState, useEffect } from 'react';
import { Icon }      from '../../components/ui/Icon';
import { atlas }     from '../../bridge/atlas';
import type { NPC }  from '../../types/npc';
import styles        from './NpcDetail.module.css';

const ROLES   = ['ally','antagonist','neutral','informant','questgiver','merchant','recurring','minor'] as const;
const VITALS  = ['alive','dead','missing','unknown'] as const;
const DISPS   = ['hostile','unfriendly','neutral','friendly','allied'] as const;

interface Props {
  npc:       NPC | null;
  onUpdated: (npc: NPC) => void;
  onDeleted: (id: string) => void;
}

export function NpcDetail({ npc, onUpdated, onDeleted }: Props) {
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', alias: '', description: '', role: 'neutral',
    vitalStatus: 'alive', dispositionTowardsPlayers: 'neutral' });

  useEffect(() => {
    if (!npc) return;
    setForm({
      name:                      npc.name,
      alias:                     npc.alias ?? '',
      description:               npc.description,
      role:                      npc.role,
      vitalStatus:               npc.vitalStatus,
      dispositionTowardsPlayers: npc.dispositionTowardsPlayers,
    });
    setEditing(false);
    setError(null);
  }, [npc?.id]);

  if (!npc) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="users" size={36} className={styles.emptyIcon} />
          <p>Select a character to view details.</p>
        </div>
      </div>
    );
  }

  async function handleSave() {
    if (!npc) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await atlas.db.run(
        `UPDATE npcs SET name=?, alias=?, description=?, role=?,
         vital_status=?, disposition_towards_players=?, updated_at=?
         WHERE id=?`,
        [form.name.trim(), form.alias.trim() || null, form.description,
         form.role, form.vitalStatus, form.dispositionTowardsPlayers, now, npc.id],
      );
      onUpdated({ ...npc, ...form, alias: form.alias.trim() || undefined,
                  vitalStatus: form.vitalStatus as NPC['vitalStatus'],
                  role: form.role as NPC['role'],
                  dispositionTowardsPlayers: form.dispositionTowardsPlayers as NPC['dispositionTowardsPlayers'],
                  updatedAt: now as NPC['updatedAt'] });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!npc || !window.confirm(`Delete "${npc.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await atlas.db.run('DELETE FROM npcs WHERE id = ?', [npc.id]);
      onDeleted(npc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  }

  const field = (label: string, children: React.ReactNode) => (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerAvatar}>{npc.name.slice(0,1).toUpperCase()}</div>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerName}>{npc.name}</h2>
          {npc.alias && <span className={styles.headerAlias}>"{npc.alias}"</span>}
        </div>
        <div className={styles.headerActions}>
          {!editing ? (
            <>
              <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Edit">
                <Icon name="scroll" size={16} />
              </button>
              <button className={`${styles.iconBtn} ${styles.danger}`}
                onClick={handleDelete} disabled={deleting} title="Delete">
                <Icon name="x" size={16} />
              </button>
            </>
          ) : (
            <>
              <button className={`${styles.iconBtn} ${styles.primary}`}
                onClick={handleSave} disabled={saving}>
                {saving ? <Icon name="loader" size={16} className={styles.spin} /> : <Icon name="chevron-right" size={16} />}
              </button>
              <button className={styles.iconBtn} onClick={() => setEditing(false)} disabled={saving}>
                <Icon name="x" size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={14}/> {error}</div>}

      <div className={styles.body}>
        {editing ? (
          <div className={styles.form}>
            {field('Name', <input className={styles.input} value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))} />)}
            {field('Alias / Title', <input className={styles.input} value={form.alias}
              placeholder="Optional" onChange={e => setForm(f => ({...f, alias: e.target.value}))} />)}
            {field('Role',
              <select className={styles.input} value={form.role}
                onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            )}
            {field('Vital Status',
              <select className={styles.input} value={form.vitalStatus}
                onChange={e => setForm(f => ({...f, vitalStatus: e.target.value}))}>
                {VITALS.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
              </select>
            )}
            {field('Disposition',
              <select className={styles.input} value={form.dispositionTowardsPlayers}
                onChange={e => setForm(f => ({...f, dispositionTowardsPlayers: e.target.value}))}>
                {DISPS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            )}
            {field('Description',
              <textarea className={`${styles.input} ${styles.textarea}`}
                value={form.description} rows={5}
                onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            )}
          </div>
        ) : (
          <div className={styles.readView}>
            <div className={styles.badges}>
              <span className={styles.badge}>{npc.role}</span>
              <span className={`${styles.badge} ${styles.badgeVital}`}>{npc.vitalStatus}</span>
              <span className={styles.badge}>{npc.dispositionTowardsPlayers}</span>
            </div>
            {npc.description ? (
              <p className={styles.description}>{npc.description}</p>
            ) : (
              <p className={styles.noDesc}>No description. Click edit to add one.</p>
            )}
            {npc.tags.length > 0 && (
              <div className={styles.tags}>
                {npc.tags.map((t: string) => <span key={t} className={styles.tag}>{t}</span>)}
              </div>
            )}
            <div className={styles.meta}>
              <span>Created {new Date(npc.createdAt).toLocaleDateString()}</span>
              <span>Updated {new Date(npc.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
