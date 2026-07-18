import { Icon }          from '../../components/ui/Icon';
import type { Encounter, EncounterStatus } from '../../types/encounter';
import styles            from './EncounterList.module.css';

const STATUS_COLOUR: Record<EncounterStatus, string> = {
  planned:  'var(--ink-400)',
  ready:    'var(--gold-400)',
  run:      '#4caf85',
  archived: 'var(--ink-600)',
};

const TYPE_GLYPH: Record<string, string> = {
  combat: '⚔️', social: '💬', exploration: '🗺️',
  skill_challenge: '🧩', boss: '💀', airship: '🎈',
};

interface Props {
  encounters: Encounter[];
  loading:    boolean;
  selectedId: string | null;
  onSelect:   (id: string) => void;
}

export function EncounterList({ encounters, loading, selectedId, onSelect }: Props) {
  if (loading) return (
    <div className={styles.panel}>
      <div className={styles.empty}><Icon name="loader" size={22} className={styles.spin}/></div>
    </div>
  );
  if (encounters.length === 0) return (
    <div className={styles.panel}>
      <div className={styles.empty}>
        <Icon name="sword" size={32} className={styles.emptyIcon}/>
        <p>No encounters match this filter.</p>
      </div>
    </div>
  );
  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {encounters.map(e => (
          <li key={e.id}>
            <button className={`${styles.item} ${selectedId === e.id ? styles.active : ''}`}
              onClick={() => onSelect(e.id)}>
              <span className={styles.typeGlyph}>{TYPE_GLYPH[e.encounterType] ?? '⚔️'}</span>
              <div className={styles.info}>
                <span className={styles.name}>{e.name}</span>
                <span className={styles.type}>
                  {e.encounterType.replace('_', ' ')}
                  {e.sessionNumber ? ` · Session ${e.sessionNumber}` : ''}
                </span>
              </div>
              <div className={styles.statusDot}
                style={{ background: STATUS_COLOUR[e.status] }} title={e.status}/>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
