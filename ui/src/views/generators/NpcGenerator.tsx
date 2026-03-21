// ui/src/views/generators/NpcGenerator.tsx

import { useState } from 'react';
import { Icon }     from '../../components/ui/Icon';
import { generateNPC, type NPC } from './generatorData';
import styles from './Generator.module.css';

const RACES = ['Any','Human','Elf','Half-Elf','Dwarf','Halfling','Gnome','Tiefling',
  'Dragonborn','Half-Orc','Aasimar','Tabaxi','Kenku','Firbolg','Goliath'];
const GENDERS = ['Any','Male','Female','Non-binary'];
const OCCUPATIONS = ['Any','Blacksmith','Tavern Keeper','Merchant','Herbalist','Sellsword',
  'Thief','Scribe','Healer','Priest','Guard','Scholar','Sailor','Farmer','Alchemist',
  'Bard','Hunter','Courtier','Spy','Gravedigger','Moneylender','Cartographer',
  'Arcanist','Knight','Harbourmaster','Innkeeper','Fence','Pilgrim'];

export default function NpcGenerator() {
  const [npc,        setNpc]        = useState<NPC | null>(null);
  const [race,       setRace]       = useState('Any');
  const [gender,     setGender]     = useState('Any');
  const [occupation, setOccupation] = useState('Any');
  const [saved,      setSaved]      = useState<NPC[]>([]);
  const [viewing,    setViewing]    = useState<NPC | null>(null);

  function generate() {
    const result = generateNPC({
      race:       race       !== 'Any' ? race       : undefined,
      gender:     gender     !== 'Any' ? gender     : undefined,
      occupation: occupation !== 'Any' ? occupation : undefined,
    });
    setNpc(result);
    setViewing(null);
  }

  function saveNpc() {
    if (npc) setSaved(prev => [npc, ...prev]);
  }

  const display = viewing ?? npc;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>NPC Options</h3>

        <label className={styles.label}>Race</label>
        <select className={styles.select} value={race} onChange={e => setRace(e.target.value)}>
          {RACES.map(r => <option key={r}>{r}</option>)}
        </select>

        <label className={styles.label}>Gender</label>
        <select className={styles.select} value={gender} onChange={e => setGender(e.target.value)}>
          {GENDERS.map(g => <option key={g}>{g}</option>)}
        </select>

        <label className={styles.label}>Occupation</label>
        <select className={styles.select} value={occupation} onChange={e => setOccupation(e.target.value)}>
          {OCCUPATIONS.map(o => <option key={o}>{o}</option>)}
        </select>

        <button className={styles.generateBtn} onClick={generate}>
          <Icon name="users" size={15} />
          Generate NPC
        </button>

        {npc && (
          <button className={styles.saveBtn} onClick={saveNpc}>
            <Icon name="plus" size={14} />
            Save to Roster
          </button>
        )}

        {saved.length > 0 && (
          <div className={styles.savedList}>
            <h4 className={styles.savedTitle}>Roster ({saved.length})</h4>
            {saved.map((s, i) => (
              <button key={i} className={`${styles.savedItem} ${viewing === s ? styles.savedItemActive : ''}`}
                onClick={() => setViewing(s)}>
                <span className={styles.savedName}>{s.name}</span>
                <span className={styles.savedRarity}>{s.race} · {s.occupation}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className={styles.result}>
        {!display ? (
          <div className={styles.empty}>
            <Icon name="users" size={40} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Configure your options and bring a character to life.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{display.name}</h2>
                <div className={styles.cardMeta}>
                  <span className={styles.metaTag}>{display.race}</span>
                  <span className={styles.metaTag}>{display.gender}</span>
                  <span className={styles.metaTag}>Age {display.age}</span>
                  <span className={styles.metaTag} style={{ color: 'var(--gold-400)', borderColor: 'var(--gold-600)' }}>
                    {display.occupation}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Personality</h4>
              <p className={styles.sectionText}>{display.personality}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Quirk</h4>
              <p className={styles.sectionText}>{display.quirk}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Goal</h4>
              <p className={styles.sectionText}>{display.goal}</p>
            </div>

            <div className={styles.section} style={{ borderLeft: '2px solid var(--crimson-600)', paddingLeft: '1rem' }}>
              <h4 className={styles.sectionLabel} style={{ color: 'var(--crimson-400)' }}>Secret</h4>
              <p className={styles.sectionText}>{display.secret}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
