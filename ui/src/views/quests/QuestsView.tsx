import { useState, useEffect, useCallback } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type { Quest, QuestStatus } from '../../types/quest';
import { QuestList }        from './QuestList';
import { QuestDetail }      from './QuestDetail';
import { QuestCreateModal } from './QuestCreateModal';
import styles               from './QuestsView.module.css';

export default function QuestsView() {
  const campaign               = useCampaignStore(s => s.campaign);
  const [quests,    setQuests] = useState<Quest[]>([]);
  const [selected, setSelected]= useState<Quest | null>(null);
  const [loading, setLoading]  = useState(true);
  const [search,  setSearch]   = useState('');
  const [filter,  setFilter]   = useState<QuestStatus | 'all'>('all');
  const [creating,setCreating] = useState(false);
  const [error,   setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      type RawQuest = Record<string, unknown>;
      const rows = await atlas.db.query<RawQuest>(
        'SELECT * FROM quests WHERE campaign_id = ? ORDER BY priority DESC, name ASC',
        [campaign.id],
      );
      const parsed: Quest[] = rows.map(r => ({
        id:               r['id'] as string,
        name:             r['name'] as string,
        description:      r['description'] as string ?? '',
        status:           r['status'] as QuestStatus,
        questType:        r['quest_type'] as Quest['questType'],
        priority:         r['priority'] as number ?? 0,
        reward:           r['reward'] as string | undefined,
        questGiverNpcId:  r['quest_giver_npc_id'] as string | null,
        sponsorFactionId: r['sponsor_faction_id'] as string | null,
        plotThreadId:     r['plot_thread_id'] as string | null,
        tags:             JSON.parse(r['tags'] as string ?? '[]') as string[],
        createdAt:        r['created_at'] as string,
        updatedAt:        r['updated_at'] as string,
        involvedNpcIds: [], locationIds: [], prerequisiteQuestIds: [],
        unlocksQuestIds: [], sessionIds: [], objectives: [], notes: [],
      }));
      setQuests(parsed);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setLoading(false); }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = atlas.on.moduleEvent(({ event }) => {
      if (event === 'quest:created' || event === 'quest:updated') load();
    });
    return unsub;
  }, [load]);

  const filtered = quests.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search && !q.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = quests.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Quests</h2>
          <span className={styles.count}>{quests.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <input className={styles.search} placeholder="Search quests…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className={styles.createBtn} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New Quest
          </button>
        </div>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={15}/> {error}</div>}

      <div className={styles.filters}>
        {(['all','active','rumour','on_hold','completed','failed','hidden'] as const).map(s => (
          <button key={s}
            className={`${styles.filterBtn} ${filter === s ? styles.active : ''}`}
            onClick={() => setFilter(s)}>
            {s === 'all' ? `All (${quests.length})` : `${s.replace('_',' ')} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        <QuestList quests={filtered} loading={loading} selected={selected} onSelect={setSelected} />
        <QuestDetail
          quest={selected}
          onUpdated={q => { setQuests(prev => prev.map(x => x.id === q.id ? q : x)); setSelected(q); }}
          onDeleted={id => { setQuests(prev => prev.filter(x => x.id !== id)); setSelected(null); }}
        />
      </div>

      {creating && (
        <QuestCreateModal campaignId={campaign!.id}
          onCreated={q => { setQuests(prev => [q, ...prev]); setCreating(false); }}
          onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
