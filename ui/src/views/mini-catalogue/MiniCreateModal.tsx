// ui/src/views/mini-catalogue/MiniCreateModal.tsx
// Minimal "new mini" form modal — name, optional base size, optional quantity.

import { useState }  from 'react';
import { Icon }      from '../../components/ui/Icon';
import { atlas }     from '../../bridge/atlas';
import styles        from './MiniCreateModal.module.css';

const BASE_SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const;

interface Props {
  campaignId: string;
  onCreated:  (id: string) => void;
  onClose:    () => void;
}

export function MiniCreateModal({ campaignId, onCreated, onClose }: Props) {
  const [name,     setName]     = useState('');
  const [baseSize, setBaseSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    const qty = Math.max(1, Math.floor(quantity));

    setSaving(true);
    setError(null);
    try {
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await atlas.db.run(
        `INSERT INTO minis (id, campaign_id, name, description, base_size, quantity, tags, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, ?, '[]', ?, ?)`,
        [id, campaignId, trimmed, baseSize || null, qty, now, now],
      );
      onCreated(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>New Mini</h3>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div className={styles.body}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="mini-name">Name *</label>
              <input
                id="mini-name"
                className={styles.input}
                autoFocus
                placeholder="e.g. Red Dragon Wyrmling"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="mini-size">Base Size</label>
                <select
                  id="mini-size"
                  className={styles.select}
                  value={baseSize}
                  onChange={e => setBaseSize(e.target.value)}
                >
                  <option value="">— none —</option>
                  {BASE_SIZES.map(s => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="mini-qty">Quantity</label>
                <input
                  id="mini-qty"
                  className={styles.input}
                  type="number"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.createBtn} disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create Mini'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
