import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import {
  generateName,
  generateLocationName,
  getNameCultureOptions,
  NAME_SPECIES_OPTIONS,
  LOCATION_CATEGORY_OPTIONS,
  type GeneratedName,
  type GeneratedLocationName,
  type LocationCategory,
} from './generatorData';
import styles from './Generator.module.css';
import localStyles from './NameGenerator.module.css';

const GENDERS = ['Any','Male','Female'] as const;
const BATCH_SIZES = ['1','3','5','10'] as const;

type NameMode = 'character' | 'location';

// Unified saved entry type
type SavedEntry =
  | ({ kind: 'character' } & GeneratedName)
  | ({ kind: 'location'  } & GeneratedLocationName);

export default function NameGenerator() {
  // ── Shared state ──────────────────────────────────────────────
  const [mode, setMode] = useState<NameMode>('character');
  const [batchSize, setBatchSize] = useState<(typeof BATCH_SIZES)[number]>('1');
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  // ── Character mode state ──────────────────────────────────────
  const [charResults, setCharResults] = useState<GeneratedName[]>([]);
  const [viewingChar, setViewingChar] = useState<GeneratedName | null>(null);
  const [species, setSpecies] = useState('Any');
  const [culture, setCulture] = useState('Any');
  const [gender, setGender] = useState<(typeof GENDERS)[number]>('Any');

  // ── Location mode state ───────────────────────────────────────
  const [locResults, setLocResults] = useState<GeneratedLocationName[]>([]);
  const [viewingLoc, setViewingLoc] = useState<GeneratedLocationName | null>(null);
  const [locCategory, setLocCategory] = useState<LocationCategory | 'Any'>('Any');

  // ── Culture options depend on species ─────────────────────────
  const cultures = useMemo(
    () => getNameCultureOptions(species !== 'Any' ? species : undefined),
    [species],
  );
  useEffect(() => {
    if (culture !== 'Any' && !cultures.includes(culture)) setCulture('Any');
  }, [culture, cultures]);

  // ── Reset viewing when mode switches ─────────────────────────
  useEffect(() => {
    setViewingChar(null);
    setViewingLoc(null);
  }, [mode]);

  // ── Generation ────────────────────────────────────────────────
  function generate() {
    const count = Number(batchSize);
    if (mode === 'character') {
      const results = Array.from({ length: count }, () =>
        generateName({
          species: species !== 'Any' ? species : undefined,
          culture: culture !== 'Any' ? culture : undefined,
          gender,
        }),
      );
      setCharResults(results);
      setViewingChar(null);
    } else {
      const results = Array.from({ length: count }, () =>
        generateLocationName({
          category: locCategory !== 'Any' ? (locCategory as LocationCategory) : undefined,
        }),
      );
      setLocResults(results);
      setViewingLoc(null);
    }
  }

  function saveResults() {
    if (mode === 'character') {
      if (!charResults.length) return;
      setSaved(prev => [...charResults.map(r => ({ kind: 'character' as const, ...r })), ...prev]);
    } else {
      if (!locResults.length) return;
      setSaved(prev => [...locResults.map(r => ({ kind: 'location' as const, ...r })), ...prev]);
    }
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

  // ── Display resolution ────────────────────────────────────────
  const primaryChar = charResults[0] ?? null;
  const displayChar = viewingChar ?? (mode === 'character' ? primaryChar : null);

  const primaryLoc = locResults[0] ?? null;
  const displayLoc = viewingLoc ?? (mode === 'location' ? primaryLoc : null);

  const hasResults = mode === 'character' ? charResults.length > 0 : locResults.length > 0;
  const isMultiBatch = mode === 'character'
    ? charResults.length > 1 && !viewingChar
    : locResults.length > 1 && !viewingLoc;

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        {/* Mode toggle */}
        <div className={localStyles.modeToggle}>
          <button
            className={`${localStyles.modeBtn} ${mode === 'character' ? localStyles.modeBtnActive : ''}`}
            onClick={() => setMode('character')}
          >
            <Icon name="users" size={13} />
            Character
          </button>
          <button
            className={`${localStyles.modeBtn} ${mode === 'location' ? localStyles.modeBtnActive : ''}`}
            onClick={() => setMode('location')}
          >
            <Icon name="map" size={13} />
            Location
          </button>
        </div>

        <h3 className={styles.sidebarTitle}>
          {mode === 'character' ? 'Name Options' : 'Location Options'}
        </h3>

        {/* Character-mode controls */}
        {mode === 'character' && (
          <>
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
          </>
        )}

        {/* Location-mode controls */}
        {mode === 'location' && (
          <>
            <label className={styles.label}>Category</label>
            <select
              className={styles.select}
              value={locCategory}
              onChange={e => setLocCategory(e.target.value as LocationCategory | 'Any')}
            >
              <option value="Any">Any</option>
              {LOCATION_CATEGORY_OPTIONS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </>
        )}

        <label className={styles.label}>Count</label>
        <select className={styles.select} value={batchSize} onChange={e => setBatchSize(e.target.value as (typeof BATCH_SIZES)[number])}>
          {BATCH_SIZES.map(option => <option key={option}>{option}</option>)}
        </select>

        <button className={styles.generateBtn} onClick={generate}>
          <Icon name="bookmark" size={15} />
          {batchSize === '1' ? 'Generate Name' : `Generate ${batchSize} Names`}
        </button>

        {hasResults && (
          <button className={styles.saveBtn} onClick={saveResults}>
            <Icon name="plus" size={14} />
            Save Generated Names
          </button>
        )}

        {/* Saved list */}
        {saved.length > 0 && (
          <div className={styles.savedList}>
            <h4 className={styles.savedTitle}>Saved Names ({saved.length})</h4>
            {saved.map((entry, index) => (
              <button
                key={`${entry.name}-${index}`}
                className={`${styles.savedItem} ${
                  (entry.kind === 'character' && viewingChar === (entry as unknown as GeneratedName)) ||
                  (entry.kind === 'location' && viewingLoc === (entry as unknown as GeneratedLocationName))
                    ? styles.savedItemActive : ''
                }`}
                onClick={() => {
                  if (entry.kind === 'character') {
                    setMode('character');
                    const e = entry as unknown as GeneratedName;
                    setViewingChar(e);
                    setViewingLoc(null);
                  } else {
                    setMode('location');
                    const e = entry as unknown as GeneratedLocationName;
                    setViewingLoc(e);
                    setViewingChar(null);
                  }
                }}
              >
                <span className={styles.savedName}>{entry.name}</span>
                <span className={styles.savedRarity}>
                  {entry.kind === 'character'
                    ? `${(entry as unknown as GeneratedName).species} · ${(entry as unknown as GeneratedName).culture}`
                    : `📍 ${(entry as unknown as GeneratedLocationName).category}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {/* ── Result panel ── */}
      <div className={styles.result}>

        {/* CHARACTER MODE DISPLAY */}
        {mode === 'character' && (
          !displayChar ? (
            <div className={styles.empty}>
              <Icon name="users" size={40} className={styles.emptyIcon} />
              <p className={styles.emptyText}>Pick species, culture, and gender to generate an Alaruel name.</p>
            </div>
          ) : (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{displayChar.name}</h2>
                  <div className={styles.cardMeta}>
                    <span className={styles.metaTag}>{displayChar.gender}</span>
                    <span className={styles.metaTag}>{displayChar.species}</span>
                    <span className={styles.metaTag} style={{ color: 'var(--gold-400)', borderColor: 'var(--gold-600)' }}>
                      {displayChar.culture}
                    </span>
                  </div>
                  <button className={styles.saveBtn} style={{ marginTop: '.65rem' }} onClick={() => copyName(displayChar.name)}>
                    <Icon name="link" size={14} />
                    {copiedName === displayChar.name ? 'Copied' : 'Copy Name'}
                  </button>
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionLabel}>Naming Style</h4>
                <p className={styles.sectionText}>{displayChar.style}</p>
              </div>

              {isMultiBatch && (
                <div className={styles.section}>
                  <h4 className={styles.sectionLabel}>Generated Batch</h4>
                  <div className={styles.batchList}>
                    {charResults.map((entry, index) => (
                      <div key={`${entry.name}-${index}`} className={styles.batchItem}>
                        <div className={styles.batchItemText}>
                          <span className={styles.savedName}>{entry.name}</span>
                          <span className={styles.savedRarity}>{entry.species} · {entry.culture} · {entry.gender}</span>
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
          )
        )}

        {/* LOCATION MODE DISPLAY */}
        {mode === 'location' && (
          !displayLoc ? (
            <div className={styles.empty}>
              <Icon name="map" size={40} className={styles.emptyIcon} />
              <p className={styles.emptyText}>Pick a location category to generate Alaruel place names.</p>
            </div>
          ) : (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{displayLoc.name}</h2>
                  <div className={styles.cardMeta}>
                    <span className={styles.metaTag} style={{ color: 'var(--gold-400)', borderColor: 'var(--gold-600)' }}>
                      {displayLoc.category}
                    </span>
                  </div>
                  <button className={styles.saveBtn} style={{ marginTop: '.65rem' }} onClick={() => copyName(displayLoc.name)}>
                    <Icon name="link" size={14} />
                    {copiedName === displayLoc.name ? 'Copied' : 'Copy Name'}
                  </button>
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionLabel}>Naming Style</h4>
                <p className={styles.sectionText}>{displayLoc.style}</p>
              </div>

              {isMultiBatch && (
                <div className={styles.section}>
                  <h4 className={styles.sectionLabel}>Generated Batch</h4>
                  <div className={styles.batchList}>
                    {locResults.map((entry, index) => (
                      <div key={`${entry.name}-${index}`} className={styles.batchItem}>
                        <div className={styles.batchItemText}>
                          <span className={styles.savedName}>{entry.name}</span>
                          <span className={styles.savedRarity}>{entry.category}</span>
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
          )
        )}
      </div>
    </div>
  );
}
