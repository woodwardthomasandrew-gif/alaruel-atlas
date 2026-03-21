// ui/src/views/generators/SettlementGenerator.tsx

import { useState } from 'react';
import { Icon }     from '../../components/ui/Icon';
import { generateSettlement, type Settlement } from './generatorData';
import styles from './Generator.module.css';

const TYPES = ['Any','Hamlet','Village','Town','City','Fortress City','Trade Port','Ruins','Outpost','Monastery'];

export default function SettlementGenerator() {
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [type,       setType]       = useState('Any');
  const [saved,      setSaved]      = useState<Settlement[]>([]);
  const [viewing,    setViewing]    = useState<Settlement | null>(null);

  function generate() {
    const result = generateSettlement({
      type: type !== 'Any' ? type : undefined,
    });
    setSettlement(result);
    setViewing(null);
  }

  function saveSettlement() {
    if (settlement) setSaved(prev => [settlement, ...prev]);
  }

  const display = viewing ?? settlement;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>Settlement Options</h3>

        <label className={styles.label}>Settlement Type</label>
        <select className={styles.select} value={type} onChange={e => setType(e.target.value)}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        <button className={styles.generateBtn} onClick={generate}>
          <Icon name="map" size={15} />
          Generate Settlement
        </button>

        {settlement && (
          <button className={styles.saveBtn} onClick={saveSettlement}>
            <Icon name="plus" size={14} />
            Save to Atlas
          </button>
        )}

        {saved.length > 0 && (
          <div className={styles.savedList}>
            <h4 className={styles.savedTitle}>Saved ({saved.length})</h4>
            {saved.map((s, i) => (
              <button key={i} className={`${styles.savedItem} ${viewing === s ? styles.savedItemActive : ''}`}
                onClick={() => setViewing(s)}>
                <span className={styles.savedName}>{s.name}</span>
                <span className={styles.savedRarity}>{s.type}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className={styles.result}>
        {!display ? (
          <div className={styles.empty}>
            <Icon name="map" size={40} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Configure your options and raise a settlement.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{display.name}</h2>
                <div className={styles.cardMeta}>
                  <span className={styles.metaTag} style={{ color: 'var(--gold-400)', borderColor: 'var(--gold-600)' }}>{display.type}</span>
                  <span className={styles.metaTag}>Pop. {display.population}</span>
                </div>
              </div>
            </div>

            <div className={styles.statBlock}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Government</span>
                <span className={styles.statValue} style={{ fontSize: '.8rem' }}>{display.government}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Location</span>
                <span className={styles.statValue} style={{ fontSize: '.8rem' }}>{display.biome}</span>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Atmosphere</h4>
              <p className={styles.sectionText}>{display.atmosphere}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Notable Location</h4>
              <p className={styles.sectionText}>{display.notableLocation}</p>
            </div>

            <div className={styles.section} style={{ borderLeft: '2px solid var(--crimson-600)', paddingLeft: '1rem' }}>
              <h4 className={styles.sectionLabel} style={{ color: 'var(--crimson-400)' }}>Current Problem</h4>
              <p className={styles.sectionText}>{display.problem}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Local Rumour</h4>
              <p className={styles.sectionText}>{display.rumour}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
