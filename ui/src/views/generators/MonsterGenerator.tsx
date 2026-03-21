// ui/src/views/generators/MonsterGenerator.tsx

import { useState } from 'react';
import { Icon }     from '../../components/ui/Icon';
import { generateMonster, type Monster } from './generatorData';
import styles from './Generator.module.css';

const SIZES = ['Any','Tiny','Small','Medium','Large','Huge','Gargantuan'];
const TAGS  = ['Any','Undead','Beast','Aberration','Construct','Elemental','Fey',
  'Fiend','Giant','Humanoid','Monstrosity','Plant','Dragon','Celestial'];
const CRS   = ['Any','1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10','12','14','16','18','20','22','24','30'];

export default function MonsterGenerator() {
  const [monster, setMonster] = useState<Monster | null>(null);
  const [size,    setSize]    = useState('Any');
  const [tag,     setTag]     = useState('Any');
  const [cr,      setCr]      = useState('Any');
  const [saved,   setSaved]   = useState<Monster[]>([]);
  const [viewing, setViewing] = useState<Monster | null>(null);

  function generate() {
    const result = generateMonster({
      size: size !== 'Any' ? size : undefined,
      tag:  tag  !== 'Any' ? tag  : undefined,
      cr:   cr   !== 'Any' ? cr   : undefined,
    });
    setMonster(result);
    setViewing(null);
  }

  function saveMonster() {
    if (monster) setSaved(prev => [monster, ...prev]);
  }

  const display = viewing ?? monster;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>Monster Options</h3>

        <label className={styles.label}>Size</label>
        <select className={styles.select} value={size} onChange={e => setSize(e.target.value)}>
          {SIZES.map(s => <option key={s}>{s}</option>)}
        </select>

        <label className={styles.label}>Creature Type</label>
        <select className={styles.select} value={tag} onChange={e => setTag(e.target.value)}>
          {TAGS.map(t => <option key={t}>{t}</option>)}
        </select>

        <label className={styles.label}>Challenge Rating</label>
        <select className={styles.select} value={cr} onChange={e => setCr(e.target.value)}>
          {CRS.map(c => <option key={c}>{c}</option>)}
        </select>

        <button className={styles.generateBtn} onClick={generate}>
          <Icon name="alert" size={15} />
          Generate Monster
        </button>

        {monster && (
          <button className={styles.saveBtn} onClick={saveMonster}>
            <Icon name="plus" size={14} />
            Save to Bestiary
          </button>
        )}

        {saved.length > 0 && (
          <div className={styles.savedList}>
            <h4 className={styles.savedTitle}>Bestiary ({saved.length})</h4>
            {saved.map((s, i) => (
              <button key={i} className={`${styles.savedItem} ${viewing === s ? styles.savedItemActive : ''}`}
                onClick={() => setViewing(s)}>
                <span className={styles.savedName}>{s.name}</span>
                <span className={styles.savedRarity}>CR {s.cr}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className={styles.result}>
        {!display ? (
          <div className={styles.empty}>
            <Icon name="alert" size={40} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Configure your options and summon a creature.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{display.name}</h2>
                <div className={styles.cardMeta}>
                  <span className={styles.metaTag}>{display.size}</span>
                  <span className={styles.metaTag}>{display.tag}</span>
                  <span className={styles.metaTag}>{display.alignment}</span>
                  <span className={styles.metaTag} style={{ color: 'var(--crimson-400)', borderColor: 'var(--crimson-600)' }}>CR {display.cr}</span>
                </div>
              </div>
            </div>

            <div className={styles.statBlock}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Hit Points</span>
                <span className={styles.statValue}>{display.hp}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Armour Class</span>
                <span className={styles.statValue}>{display.ac}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Environment</span>
                <span className={styles.statValue} style={{ fontSize: '.8rem' }}>{display.environment}</span>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Primary Attack</h4>
              <p className={styles.sectionText}>{display.attack}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Special Traits</h4>
              <ul className={styles.traitList}>
                {display.traits.map((t, i) => (
                  <li key={i} className={styles.traitItem}>{t}</li>
                ))}
              </ul>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Lore</h4>
              <p className={styles.sectionText}>{display.lore}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
