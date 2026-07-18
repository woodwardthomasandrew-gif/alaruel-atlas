import { useState, useEffect, useCallback } from 'react';
import { Icon }      from '../../components/ui/Icon';
import { atlas }     from '../../bridge/atlas';
import type { Encounter, EncounterMonster, EncounterMini } from '../../types/encounter';
import { EncounterOverviewTab } from './tabs/EncounterOverviewTab';
import { EncounterRosterTab }   from './tabs/EncounterRosterTab';
import { EncounterMinisTab }    from './tabs/EncounterMinisTab';
import { EncounterMapTab }      from './tabs/EncounterMapTab';
import { EncounterCombatTab }   from './tabs/EncounterCombatTab';
import { EncounterRewardsTab }  from './tabs/EncounterRewardsTab';
import { EncounterNotesTab }    from './tabs/EncounterNotesTab';
import { EncounterPrintTab }    from './tabs/EncounterPrintTab';
import styles from './EncounterDetail.module.css';

const TABS = [
  { key: 'overview', label: 'Overview',      icon: 'scroll'   },
  { key: 'roster',   label: 'Enemy Roster',  icon: 'skull'    },
  { key: 'minis',    label: 'Miniatures',    icon: 'box'      },
  { key: 'map',      label: 'Map & Terrain', icon: 'map'      },
  { key: 'combat',   label: 'Combat Tools',  icon: 'sword'    },
  { key: 'rewards',  label: 'Rewards',       icon: 'sparkles' },
  { key: 'notes',    label: 'Notes',         icon: 'edit'     },
  { key: 'print',    label: 'Printing',      icon: 'upload'   },
] as const;
type TabKey = typeof TABS[number]['key'];

interface Props {
  encounterId: string | null;
  campaignId:  string;
  onDeleted:   (id: string) => void;
  onChanged:   () => void;
}

function rowToEncounter(r: Record<string, unknown>): Encounter {
  return {
    id: r['id'] as string, name: r['name'] as string, description: r['description'] as string ?? '',
    encounterType: r['encounter_type'] as Encounter['encounterType'], status: r['status'] as Encounter['status'],
    sessionNumber: r['session_number'] as number | undefined, sessionId: r['session_id'] as string | null,
    dungeonRoomId: r['dungeon_room_id'] as string | null, location: r['location'] as string ?? '',
    difficulty: r['difficulty'] as Encounter['difficulty'], tags: JSON.parse(r['tags'] as string ?? '[]'),
    notes: r['notes'] as string ?? '',
    partyId: r['party_id'] as string | null, partyLevel: r['party_level'] as number | null,
    airshipPresent: r['airship_present'] === 1, partyNotes: r['party_notes'] as string ?? '',
    battleMapAssetId: r['battle_map_asset_id'] as string | null, mapNotes: r['map_notes'] as string ?? '',
    terrainNotes: r['terrain_notes'] as string ?? '',
    environmentalEffects: JSON.parse(r['environmental_effects'] as string ?? '[]'),
    legendaryActions: JSON.parse(r['legendary_actions'] as string ?? '[]'),
    lairActions: JSON.parse(r['lair_actions'] as string ?? '[]'),
    conditions: JSON.parse(r['conditions'] as string ?? '[]'),
    loot: r['loot'] as string ?? '', xpAward: r['xp_award'] as number | null,
    storyRewards: r['story_rewards'] as string ?? '', reputationRewards: r['reputation_rewards'] as string ?? '',
    rewardNotes: r['reward_notes'] as string ?? '',
    createdAt: r['created_at'] as string, updatedAt: r['updated_at'] as string,
  };
}

export function EncounterDetail({ encounterId, campaignId, onDeleted, onChanged }: Props) {
  const [tab,        setTab]        = useState<TabKey>('overview');
  const [encounter,  setEncounter]  = useState<Encounter | null>(null);
  const [monsters,   setMonsters]   = useState<EncounterMonster[]>([]);
  const [minis,      setMinis]      = useState<EncounterMini[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!encounterId) { setEncounter(null); return; }
    setLoading(true); setError(null);
    try {
      const [encRows, monsterRows, miniRows] = await Promise.all([
        atlas.db.query<Record<string, unknown>>('SELECT * FROM encounters WHERE id = ?', [encounterId]),
        atlas.db.query<Record<string, unknown>>(
          `SELECT em.*, m.name AS monster_name, m.creature_type, m.challenge_rating
             FROM encounter_monsters em
             LEFT JOIN monsters m ON m.id = em.monster_id
            WHERE em.encounter_id = ?
            ORDER BY em.sort_order ASC`,
          [encounterId],
        ),
        atlas.db.query<Record<string, unknown>>(
          `SELECT emi.*, mn.name AS mini_name
             FROM encounter_minis emi
             LEFT JOIN minis mn ON mn.id = emi.mini_id
            WHERE emi.encounter_id = ?`,
          [encounterId],
        ),
      ]);
      if (!encRows[0]) { setEncounter(null); return; }
      setEncounter(rowToEncounter(encRows[0]));
      setMonsters(monsterRows.map(r => ({
        id: r['id'] as string, monsterId: r['monster_id'] as string,
        monsterName: r['monster_name'] as string | undefined,
        creatureType: r['creature_type'] as string | undefined,
        challengeRating: r['challenge_rating'] as string | undefined,
        customName: r['custom_name'] as string | undefined,
        quantity: r['quantity'] as number, groupLabel: r['group_label'] as string | undefined,
        notes: r['notes'] as string | undefined, sortOrder: r['sort_order'] as number,
      })));
      setMinis(miniRows.map(r => ({
        id: r['id'] as string, encounterMonsterId: r['encounter_monster_id'] as string | undefined,
        miniId: r['mini_id'] as string | undefined, miniName: r['mini_name'] as string | undefined,
        quantity: r['quantity'] as number, assignment: r['assignment'] as EncounterMini['assignment'],
        proxyNotes: r['proxy_notes'] as string | undefined,
      })));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setLoading(false); }
  }, [encounterId]);

  useEffect(() => { load(); setTab('overview'); }, [encounterId]);

  const refresh = useCallback(() => { load(); onChanged(); }, [load, onChanged]);

  if (!encounterId) return (
    <div className={styles.panel}>
      <div className={styles.empty}>
        <Icon name="sword" size={36} className={styles.emptyIcon}/>
        <p>Select an encounter to open the workspace.</p>
      </div>
    </div>
  );

  if (loading && !encounter) return (
    <div className={styles.panel}>
      <div className={styles.empty}><Icon name="loader" size={26} className={styles.spin}/></div>
    </div>
  );

  if (!encounter) return (
    <div className={styles.panel}>
      <div className={styles.empty}><p>Encounter not found.</p></div>
    </div>
  );

  async function handleDelete() {
    if (!encounter || !window.confirm(`Delete "${encounter.name}"? This removes its roster and mini assignments too.`)) return;
    await atlas.db.run('DELETE FROM encounters WHERE id = ?', [encounter.id]);
    onDeleted(encounter.id);
  }

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerName}>{encounter.name}</h2>
          <div className={styles.headerMeta}>
            <span className={`${styles.badge} ${styles[`status_${encounter.status}`]}`}>{encounter.status}</span>
            <span className={styles.badge}>{encounter.encounterType.replace('_', ' ')}</span>
            <span className={styles.badge}>{encounter.difficulty}</span>
            {encounter.location && <span className={styles.badge}>{encounter.location}</span>}
          </div>
        </div>
        <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDelete} title="Delete encounter">
          <Icon name="trash" size={16}/>
        </button>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={14}/> {error}</div>}

      <nav className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.key} className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={14}/> {t.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabBody}>
        {tab === 'overview' && <EncounterOverviewTab encounter={encounter} campaignId={campaignId} onSaved={refresh}/>}
        {tab === 'roster'   && <EncounterRosterTab encounter={encounter} monsters={monsters} campaignId={campaignId} onChanged={refresh}/>}
        {tab === 'minis'    && <EncounterMinisTab encounter={encounter} monsters={monsters} minis={minis} campaignId={campaignId} onChanged={refresh}/>}
        {tab === 'map'      && <EncounterMapTab encounter={encounter} onSaved={refresh}/>}
        {tab === 'combat'   && <EncounterCombatTab encounter={encounter} onSaved={refresh}/>}
        {tab === 'rewards'  && <EncounterRewardsTab encounter={encounter} onSaved={refresh}/>}
        {tab === 'notes'    && <EncounterNotesTab encounter={encounter} onSaved={refresh}/>}
        {tab === 'print'    && <EncounterPrintTab encounter={encounter} monsters={monsters} minis={minis}/>}
      </div>
    </div>
  );
}
