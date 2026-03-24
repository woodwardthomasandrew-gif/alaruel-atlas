// ui/src/views/mini-catalogue/MiniList.tsx
// Scrollable left-panel list of minis.

import { Icon }             from '../../components/ui/Icon';
import type { MiniSummary } from './MiniCatalogueView';
import styles               from './MiniList.module.css';

const SIZE_ABBREV: Record<string, string> = {
  tiny: 'T', small: 'S', medium: 'M', large: 'L', huge: 'H', gargantuan: 'G',
};

interface Props {
  minis:      MiniSummary[];
  loading:    boolean;
  selectedId: string | null;
  onSelect:   (id: string) => void;
}

export function MiniList({ minis, loading, selectedId, onSelect }: Props) {
  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="loader" size={22} className={styles.spin} />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (minis.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="box" size={32} className={styles.emptyIcon} />
          <p>No minis yet.</p>
          <p className={styles.emptyHint}>Add one with the button above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {minis.map(mini => (
          <li key={mini.id}>
            <button
              className={`${styles.item} ${selectedId === mini.id ? styles.active : ''}`}
              onClick={() => onSelect(mini.id)}
            >
              <div className={styles.avatar}>
                {mini.name.slice(0, 1).toUpperCase()}
              </div>
              <div className={styles.info}>
                <span className={styles.name}>{mini.name}</span>
                {mini.base_size && (
                  <span className={styles.size}>
                    {mini.base_size.charAt(0).toUpperCase() + mini.base_size.slice(1)}
                  </span>
                )}
              </div>
              <div className={styles.badges}>
                {mini.quantity > 1 && (
                  <span className={styles.quantityBadge} title={`Quantity: ${mini.quantity}`}>
                    ×{mini.quantity}
                  </span>
                )}
                {mini.base_size && (
                  <span className={styles.sizeBadge} title={mini.base_size}>
                    {SIZE_ABBREV[mini.base_size] ?? '?'}
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
