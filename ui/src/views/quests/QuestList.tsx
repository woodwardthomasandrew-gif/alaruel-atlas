import { Icon }          from '../../components/ui/Icon';
import type { Quest, QuestStatus } from '../../types/quest';
import styles            from './QuestList.module.css';

const STATUS_COLOUR: Record<QuestStatus, string> = {
  active:    'var(--gold-400)',
  rumour:    'var(--ink-400)',
  on_hold:   'var(--ink-300)',
  completed: '#4caf85',
  failed:    'var(--crimson-400)',
  abandoned: 'var(--ink-600)',
  hidden:    'var(--ink-600)',
};

const TYPE_ICON: Record<string, string> = {
  main: '◈', side: '◇', personal: '♦', faction: '⊕',
  exploration: '◉', fetch: '◎', escort: '◌', eliminate: '✕', mystery: '?',
};

interface Props { quests: Quest[]; loading: boolean; selected: Quest | null; onSelect: (q: Quest) => void; }

export function QuestList({ quests, loading, selected, onSelect }: Props) {
  if (loading) return (
    <div className={styles.panel}>
      <div className={styles.empty}><Icon name="loader" size={22} className={styles.spin}/></div>
    </div>
  );
  if (quests.length === 0) return (
    <div className={styles.panel}>
      <div className={styles.empty}>
        <Icon name="scroll" size={32} className={styles.emptyIcon}/>
        <p>No quests match this filter.</p>
      </div>
    </div>
  );
  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {quests.map(q => (
          <li key={q.id}>
            <button className={`${styles.item} ${selected?.id === q.id ? styles.active : ''}`}
              onClick={() => onSelect(q)}>
              <span className={styles.typeGlyph}>{TYPE_ICON[q.questType] ?? '◇'}</span>
              <div className={styles.info}>
                <span className={styles.name}>{q.name}</span>
                <span className={styles.type}>{q.questType} quest</span>
              </div>
              <div className={styles.statusDot}
                style={{ background: STATUS_COLOUR[q.status] }} title={q.status}/>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
