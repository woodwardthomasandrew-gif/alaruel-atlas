// ui/src/views/generators/MagicItemGenerator.tsx

import { useState } from 'react';
import { Icon }     from '../../components/ui/Icon';
import { generateMagicItem, type MagicItem } from './generatorData';
import styles from './Generator.module.css';

const RARITIES  = ['Any','Common','Uncommon','Rare','Very Rare','Legendary','Artifact'];
const ITEM_TYPES = ['Any','Sword','Dagger','Staff','Wand','Ring','Amulet','Cloak','Boots',
  'Gauntlets','Helm','Shield','Tome','Orb','Bow','Axe','Spear','Bracers','Belt',
  'Chalice','Mirror','Lantern','Horn','Quiver','Locket'];

const RARITY_COLOURS: Record<string, string> = {
  Common:    'var(--ink-300)',
  Uncommon:  '#4ade80',
  Rare:      '#60a5fa',
  'Very Rare':'#c084fc',
  Legendary: 'var(--gold-400)',
  Artifact:  'var(--crimson-400)',
};

export default function MagicItemGenerator() {
  const [item,     setItem]    = useState<MagicItem | null>(null);
  const [rarity,   setRarity]  = useState('Any');
  const [type,     setType]    = useState('Any');
  const [cursed,   setCursed]  = useState<'random' | 'yes' | 'no'>('random');
  const [saved,    setSaved]   = useState<MagicItem[]>([]);
  const [viewing,  setViewing] = useState<MagicItem | null>(null);

  function generate() {
    const result = generateMagicItem({
      rarity:  rarity  !== 'Any' ? rarity  : undefined,
      type:    type    !== 'Any' ? type    : undefined,
      cursed:  cursed === 'random' ? 'random' : cursed === 'yes',
    });
    setItem(result);
    setViewing(null);
  }

  function saveItem() {
    if (item) setSaved(prev => [item, ...prev]);
  }

  const display = viewing ?? item;

  return (
    <div className={styles.layout}>
      {/* Controls */}
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>Magic Item Options</h3>

        <label className={styles.label}>Rarity</label>
        <select className={styles.select} value={rarity} onChange={e => setRarity(e.target.value)}>
          {RARITIES.map(r => <option key={r}>{r}</option>)}
        </select>

        <label className={styles.label}>Item Type</label>
        <select className={styles.select} value={type} onChange={e => setType(e.target.value)}>
          {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        <label className={styles.label}>Cursed?</label>
        <div className={styles.radioGroup}>
          {(['random','yes','no'] as const).map(v => (
            <label key={v} className={styles.radioLabel}>
              <input type="radio" name="cursed" value={v}
                checked={cursed === v} onChange={() => setCursed(v)} />
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </label>
          ))}
        </div>

        <button className={styles.generateBtn} onClick={generate}>
          <Icon name="sword" size={15} />
          Generate Item
        </button>

        {item && (
          <button className={styles.saveBtn} onClick={saveItem}>
            <Icon name="plus" size={14} />
            Save to Collection
          </button>
        )}

        {saved.length > 0 && (
          <div className={styles.savedList}>
            <h4 className={styles.savedTitle}>Saved Items ({saved.length})</h4>
            {saved.map((s, i) => (
              <button key={i} className={`${styles.savedItem} ${viewing === s ? styles.savedItemActive : ''}`}
                onClick={() => { setViewing(s); }}>
                <span className={styles.savedName}>{s.name}</span>
                <span className={styles.savedRarity} style={{ color: RARITY_COLOURS[s.rarity] }}>{s.rarity}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* Result */}
      <div className={styles.result}>
        {!display ? (
          <div className={styles.empty}>
            <Icon name="sword" size={40} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Configure your options and generate a magic item.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{display.name}</h2>
                <div className={styles.cardMeta}>
                  <span className={styles.metaTag}>{display.type}</span>
                  <span className={styles.metaTag} style={{ color: RARITY_COLOURS[display.rarity], borderColor: RARITY_COLOURS[display.rarity] }}>
                    {display.rarity}
                  </span>
                  {display.cursed && <span className={styles.metaTag} style={{ color: 'var(--crimson-400)', borderColor: 'var(--crimson-600)' }}>Cursed</span>}
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Material</h4>
              <p className={styles.sectionText}>{display.material.charAt(0).toUpperCase() + display.material.slice(1)}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Magical Ability</h4>
              <p className={styles.sectionText}>{display.ability}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Notable Property</h4>
              <p className={styles.sectionText}>{display.property}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Lore</h4>
              <p className={styles.sectionText}>{display.lore}</p>
            </div>

            {display.cursed && display.curse && (
              <div className={styles.section} style={{ borderLeft: '2px solid var(--crimson-600)', paddingLeft: '1rem' }}>
                <h4 className={styles.sectionLabel} style={{ color: 'var(--crimson-400)' }}>Curse</h4>
                <p className={styles.sectionText}>{display.curse}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
