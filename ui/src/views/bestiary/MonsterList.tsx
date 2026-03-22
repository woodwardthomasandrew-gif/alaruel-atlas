// ui/src/views/bestiary/MonsterList.tsx — scrollable bestiary list panel

import { Icon }   from '../../components/ui/Icon';
import styles     from './MonsterList.module.css';

// Minimal shape needed by the list (avoids importing the full shared type into renderer)
export interface MonsterSummary {
  id:             string;
  name:           string;
  creatureType:   string;
  size:           string;
  challengeRating: string;
  isHomebrew:     boolean;
}

const TYPE_LABELS: Record<string, string> = {
  aberration:'Aberration', beast:'Beast', celestial:'Celestial',
  construct:'Construct', dragon:'Dragon', elemental:'Elemental',
  fey:'Fey', fiend:'Fiend', giant:'Giant', humanoid:'Humanoid',
  monstrosity:'Monstrosity', ooze:'Ooze', plant:'Plant', undead:'Undead',
  custom:'Custom',
};

const SIZE_ABBREV: Record<string, string> = {
  tiny:'T', small:'S', medium:'M', large:'L', huge:'H', gargantuan:'G',
};

interface Props {
  monsters:  MonsterSummary[];
  loading:   boolean;
  selected:  MonsterSummary | null;
  onSelect:  (m: MonsterSummary) => void;
}

export function MonsterList({ monsters, loading, selected, onSelect }: Props) {
  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="loader" size={22} className={styles.spin} />
          <span>Loading bestiary…</span>
        </div>
      </div>
    );
  }

  if (monsters.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="skull" size={32} className={styles.emptyIcon} />
          <p>No monsters yet.</p>
          <p className={styles.emptyHint}>Create one with the button above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {monsters.map(m => (
          <li key={m.id}>
            <button
              className={`${styles.item} ${selected?.id === m.id ? styles.active : ''}`}
              onClick={() => onSelect(m)}
            >
              <div className={styles.avatar} aria-hidden>
                {SIZE_ABBREV[m.size] ?? m.size.slice(0,1).toUpperCase()}
              </div>
              <div className={styles.info}>
                <span className={styles.name}>{m.name}</span>
                <span className={styles.meta}>
                  {TYPE_ABBREV(m.size, m.creatureType)}
                  {m.isHomebrew && ' · Homebrew'}
                </span>
              </div>
              <span className={styles.crBadge}>CR {m.challengeRating}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TYPE_ABBREV(size: string, type: string): string {
  const s = size.slice(0,1).toUpperCase() + size.slice(1);
  const t = TYPE_LABELS[type] ?? type;
  return `${s} ${t}`;
}
