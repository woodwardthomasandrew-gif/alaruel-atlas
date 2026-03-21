// ui/src/views/generators/NpcGenerator.tsx

import { useState }         from 'react';
import { useNavigate }      from 'react-router-dom';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import { generateNPC, type NPC as GeneratedNPC } from './generatorData';
import styles from './Generator.module.css';
import exportStyles from './NpcGenerator.module.css';

const RACES = ['Any','Human','Elf','Half-Elf','Dwarf','Halfling','Gnome','Tiefling',
  'Dragonborn','Half-Orc','Aasimar','Tabaxi','Kenku','Firbolg','Goliath'];
const GENDERS = ['Any','Male','Female','Non-binary'];
const OCCUPATIONS = ['Any','Blacksmith','Tavern Keeper','Merchant','Herbalist','Sellsword',
  'Thief','Scribe','Healer','Priest','Guard','Scholar','Sailor','Farmer','Alchemist',
  'Bard','Hunter','Courtier','Spy','Gravedigger','Moneylender','Cartographer',
  'Arcanist','Knight','Harbourmaster','Innkeeper','Fence','Pilgrim'];

// Maps generator occupation strings to the NPC role enum
function occupationToRole(occupation: string): string {
  const map: Record<string, string> = {
    'Sellsword': 'ally', 'Knight': 'ally', 'Guard': 'ally',
    'Thief': 'antagonist', 'Spy': 'antagonist',
    'Merchant': 'merchant', 'Moneylender': 'merchant', 'Fence': 'merchant',
    'Herbalist': 'informant', 'Scribe': 'informant', 'Scholar': 'informant',
    'Cartographer': 'informant', 'Harbourmaster': 'informant',
    'Priest': 'questgiver', 'Pilgrim': 'questgiver',
  };
  return map[occupation] ?? 'minor';
}

export default function NpcGenerator() {
  const campaign  = useCampaignStore(s => s.campaign);
  const navigate  = useNavigate();

  const [npc,        setNpc]        = useState<GeneratedNPC | null>(null);
  const [race,       setRace]       = useState('Any');
  const [gender,     setGender]     = useState('Any');
  const [occupation, setOccupation] = useState('Any');
  const [exporting,  setExporting]  = useState(false);
  const [exported,   setExported]   = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function generate() {
    const result = generateNPC({
      race:       race       !== 'Any' ? race       : undefined,
      gender:     gender     !== 'Any' ? gender     : undefined,
      occupation: occupation !== 'Any' ? occupation : undefined,
    });
    setNpc(result);
    setExported(false);
    setExportError(null);
  }

  async function exportToCharacters() {
    if (!npc || !campaign) return;
    setExporting(true);
    setExportError(null);
    try {
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();

      // Build a rich description from the generated fields
      const description = [
        `Race: ${npc.race}  |  Gender: ${npc.gender}  |  Age: ${npc.age}  |  Occupation: ${npc.occupation}`,
        '',
        `Personality: ${npc.personality}`,
        '',
        `Quirk: ${npc.quirk}`,
        '',
        `Goal: ${npc.goal}`,
        '',
        `Secret: ${npc.secret}`,
      ].join('\n');

      await atlas.db.run(
        `INSERT INTO npcs
           (id, campaign_id, name, alias, description, role, vital_status,
            disposition_towards_players, portrait_asset_id, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'alive', 'neutral', NULL, '[]', ?, ?)`,
        [id, campaign.id, npc.name, null, description,
         occupationToRole(npc.occupation), now, now],
      );

      setExported(true);
      // Brief pause so the user sees the confirmation, then navigate
      setTimeout(() => navigate('/npcs'), 800);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
      setExporting(false);
    }
  }

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

        {npc && !exported && (
          <button
            className={exportStyles.exportBtn}
            onClick={exportToCharacters}
            disabled={exporting}
          >
            <Icon name="users" size={14} />
            {exporting ? 'Saving…' : 'Export to Characters'}
          </button>
        )}

        {exported && (
          <div className={exportStyles.exportSuccess}>
            <Icon name="eye" size={13} />
            Saved! Opening Characters…
          </div>
        )}

        {exportError && (
          <div className={exportStyles.exportError}>
            <Icon name="alert" size={13} />
            {exportError}
          </div>
        )}
      </aside>

      <div className={styles.result}>
        {!npc ? (
          <div className={styles.empty}>
            <Icon name="users" size={40} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Configure your options and bring a character to life.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{npc.name}</h2>
                <div className={styles.cardMeta}>
                  <span className={styles.metaTag}>{npc.race}</span>
                  <span className={styles.metaTag}>{npc.gender}</span>
                  <span className={styles.metaTag}>Age {npc.age}</span>
                  <span className={styles.metaTag} style={{ color: 'var(--gold-400)', borderColor: 'var(--gold-600)' }}>
                    {npc.occupation}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Personality</h4>
              <p className={styles.sectionText}>{npc.personality}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Quirk</h4>
              <p className={styles.sectionText}>{npc.quirk}</p>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>Goal</h4>
              <p className={styles.sectionText}>{npc.goal}</p>
            </div>

            <div className={styles.section} style={{ borderLeft: '2px solid var(--crimson-600)', paddingLeft: '1rem' }}>
              <h4 className={styles.sectionLabel} style={{ color: 'var(--crimson-400)' }}>Secret</h4>
              <p className={styles.sectionText}>{npc.secret}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
