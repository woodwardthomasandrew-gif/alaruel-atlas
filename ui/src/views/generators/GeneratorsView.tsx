// ui/src/views/generators/GeneratorsView.tsx
// Root Generators view — four tabbed generator suites, fully offline.

import { useState }           from 'react';
import { Icon }               from '../../components/ui/Icon';
import MagicItemGenerator     from './MagicItemGenerator';
import MonsterGenerator       from './MonsterGenerator';
import NameGenerator          from './NameGenerator';
import NpcGenerator           from './NpcGenerator';
import SettlementGenerator    from './SettlementGenerator';
import styles                 from './GeneratorsView.module.css';

type Tab = 'magic-item' | 'monster' | 'npc' | 'settlement' | 'name';

const TABS: { id: Tab; label: string; icon: Parameters<typeof Icon>[0]['name']; desc: string }[] = [
  { id: 'name',        label: 'Names',        icon: 'bookmark', desc: 'Generate culture-based identities'   },
  { id: 'npc',         label: 'NPCs',         icon: 'users',  desc: 'Birth characters with history'        },
  { id: 'settlement',  label: 'Settlements',  icon: 'map',    desc: 'Raise cities & hidden hamlets'        },
  { id: 'monster',     label: 'Monsters',     icon: 'alert',  desc: 'Conjure beasts & abominations'        },
  { id: 'magic-item',  label: 'Magic Items',  icon: 'sword',  desc: 'Forge enchanted relics & artefacts'  },
];

export default function GeneratorsView() {
  const [activeTab, setActiveTab] = useState<Tab>('name');

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Generators</h2>
          <span className={styles.subtitle}>Random World Building</span>
        </div>
      </header>

      <nav className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={14} className={styles.tabIcon} />
            <span className={styles.tabLabel}>{tab.label}</span>
            <span className={styles.tabDesc}>{tab.desc}</span>
          </button>
        ))}
      </nav>

      <div className={styles.panel}>
        {activeTab === 'magic-item'  && <MagicItemGenerator  />}
        {activeTab === 'monster'     && <MonsterGenerator    />}
        {activeTab === 'npc'         && <NpcGenerator        />}
        {activeTab === 'settlement'  && <SettlementGenerator />}
        {activeTab === 'name'        && <NameGenerator       />}
      </div>
    </div>
  );
}
