import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import {
  generateName,
  getNameCultureOptions,
  NAME_SPECIES_OPTIONS,
  type GeneratedName,
} from './generatorData';
import styles from './Generator.module.css';

const GENDERS = ['Any','Male','Female'] as const;
const BATCH_SIZES = ['1','3','5','10'] as const;

export default function NameGenerator() {
  const [generatedNames, setGeneratedNames] = useState<GeneratedName[]>([]);
  const [species, setSpecies] = useState('Any');
  const [culture, setCulture] = useState('Any');
  const [gender, setGender] = useState<(typeof GENDERS)[number]>('Any');
  const [batchSize, setBatchSize] = useState<(typeof BATCH_SIZES)[number]>('1');
  const [saved, setSaved] = useState<GeneratedName[]>([]);
  const [viewing, setViewing] = useState<GeneratedName | null>(null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const cultures = useMemo(
    () => getNameCultureOptions(species !== 'Any' ? species : undefined),
    [species],
  );

  useEffect(() => {
    if (culture !== 'Any' && !cultures.includes(culture)) {
      setCulture('Any');
    }
  }, [culture, cultures]);

  function generate() {
    const count = Number(batchSize);
    const results = Array.from({ length: count }, () => generateName({
      species: species !== 'Any' ? species : undefined,
      culture: culture !== 'Any' ? culture : undefined,
      gender,
    }));
    setGeneratedNames(results);
    setViewing(null);
  }

  function saveName() {
    if (!generatedNames.length) return;
    setSaved(prev => [...generatedNames, ...prev]);
  }

  async function copyName(name: string) {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
      setTimeout(() => setCopiedName(current => (current === name ? null : current)), 900);
    } catch {
      setCopiedName(null);
    }
  }

  const primaryGenerated = generatedNames[0] ?? null;
  const display = viewing ?? primaryGenerated;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarTitle}>Name Options</h3>

        <label className={styles.label}>Species</label>
        <select className={styles.select} value={species} onChange={e => setSpecies(e.target.value)}>
          <option>Any</option>
          {NAME_SPECIES_OPTIONS.map(option => <option key={option}>{option}</option>)}
        </select>

        <label className={styles.label}>Culture</label>
        <select className={styles.select} value={culture} onChange={e => setCulture(e.target.value)}>
          <option>Any</option>
          {cultures.map(option => <option key={option}>{option}</option>)}
        </select>

        <label className={styles.label}>Gender</label>
        <select className={styles.select} value={gender} onChange={e => setGender(e.target.value as (typeof GENDERS)[number])}>
          {GENDERS.map(option => <option key={option}>{option}</option>)}
        </select>

        <label className={styles.label}>Count</label>
        <select className={styles.select} value={batchSize} onChange={e => setBatchSize(e.target.value as (typeof BATCH_SIZES)[number])}>
          {BATCH_SIZES.map(option => <option key={option}>{option}</option>)}
        </select>

        <button className={styles.generateBtn} onClick={generate}>
          <Icon name="bookmark" size={15} />
          {batchSize === '1' ? 'Generate Name' : `Generate ${batchSize} Names`}
        </button>

        {generatedNames.length > 0 && (
          <button className={styles.saveBtn} onClick={saveName}>
            <Icon name="plus" size={14} />
            Save Generated Names
          </button>
        )}

        {saved.length > 0 && (
          <div className={styles.savedList}>
            <h4 className={styles.savedTitle}>Saved Names ({saved.length})</h4>
            {saved.map((entry, index) => (
              <button
                key={`${entry.name}-${index}`}
                className={`${styles.savedItem} ${viewing === entry ? styles.savedItemActive : ''}`}
                onClick={() => setViewing(entry)}
              >
                <span className={styles.savedName}>{entry.name}</span>
                <span className={styles.savedRarity}>{entry.species} - {entry.culture}</span>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className={styles.result}>
        {!display ? (
          <div className={styles.empty}>
            <Icon name="bookmark" size={40} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Pick species, culture, and gender to generate an Alaruel name.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{display.name}</h2>
                <div className={styles.cardMeta}>
                  <span className={styles.metaTag}>{display.gender}</span>
                  <span className={styles.metaTag}>{display.species}</span>
                  <span className={styles.metaTag} style={{ color: 'var(--gold-400)', borderColor: 'var(--gold-600)' }}>
                    {display.culture}
                  </span>
                </div>
                <button className={styles.saveBtn} onClick={() => copyName(display.name)}>
                  <Icon name="link" size={14} />
                  {copiedName === display.name ? 'Copied' : 'Copy Name'}
                </button>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Naming Style</h4>
              <p className={styles.sectionText}>{display.style}</p>
            </div>

            {generatedNames.length > 1 && !viewing && (
              <div className={styles.section}>
                <h4 className={styles.sectionLabel}>Generated Batch</h4>
                <div className={styles.batchList}>
                  {generatedNames.map((entry, index) => (
                    <div key={`${entry.name}-${index}`} className={styles.batchItem}>
                      <div className={styles.batchItemText}>
                        <span className={styles.savedName}>{entry.name}</span>
                        <span className={styles.savedRarity}>{entry.species} - {entry.culture} - {entry.gender}</span>
                      </div>
                      <button className={styles.saveBtn} onClick={() => copyName(entry.name)}>
                        <Icon name="link" size={13} />
                        {copiedName === entry.name ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
