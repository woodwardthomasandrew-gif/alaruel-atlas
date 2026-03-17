// ui/src/views/npcs/NpcList.tsx — scrollable NPC list panel

import type { NPC } from '../../types/npc';
import { Icon }     from '../../components/ui/Icon';
import styles       from './NpcList.module.css';

const ROLE_LABELS: Record<string, string> = {
  ally: 'Ally', antagonist: 'Antagonist', neutral: 'Neutral',
  informant: 'Informant', questgiver: 'Quest Giver', merchant: 'Merchant',
  recurring: 'Recurring', minor: 'Minor',
};

const VITAL_COLOURS: Record<string, string> = {
  alive: 'var(--gold-500)', dead: 'var(--crimson-400)',
  missing: 'var(--ink-400)', unknown: 'var(--ink-500)',
};

interface Props {
  npcs:      NPC[];
  loading:   boolean;
  selected:  NPC | null;
  onSelect:  (npc: NPC) => void;
}

export function NpcList({ npcs, loading, selected, onSelect }: Props) {
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

  if (npcs.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="users" size={32} className={styles.emptyIcon} />
          <p>No characters yet.</p>
          <p className={styles.emptyHint}>Create one with the button above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {npcs.map(npc => (
          <li key={npc.id}>
            <button
              className={`${styles.item} ${selected?.id === npc.id ? styles.active : ''}`}
              onClick={() => onSelect(npc)}
            >
              <div className={styles.avatar} aria-hidden>
                {npc.name.slice(0, 1).toUpperCase()}
              </div>
              <div className={styles.info}>
                <span className={styles.name}>{npc.name}</span>
                {npc.alias && <span className={styles.alias}>"{npc.alias}"</span>}
                <span className={styles.role}>{ROLE_LABELS[npc.role] ?? npc.role}</span>
              </div>
              <div
                className={styles.vitalDot}
                title={npc.vitalStatus}
                style={{ background: VITAL_COLOURS[npc.vitalStatus] ?? 'var(--ink-500)' }}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
