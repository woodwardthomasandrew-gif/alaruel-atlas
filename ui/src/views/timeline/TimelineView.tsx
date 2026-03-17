import { useState, useEffect, useCallback } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type { CampaignEvent, CampaignEventType, EventSignificance } from '../../types/event';
import styles               from './TimelineView.module.css';

const SIG_COLOUR: Record<EventSignificance,string> = {
  trivial:'var(--ink-600)', minor:'var(--ink-400)', moderate:'var(--ink-300)',
  major:'var(--gold-400)', critical:'var(--crimson-400)',
};
const TYPE_GLYPH: Record<CampaignEventType,string> = {
  battle:'⚔', political:'⚖', discovery:'◉', death:'✦', birth:'✧',
  quest:'◈', faction:'⊕', natural:'☁', social:'♦', mystery:'?', other:'·',
};

export default function TimelineView() {
  const campaign = useCampaignStore(s => s.campaign);
  const [events,  setEvents]  = useState<CampaignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<CampaignEventType|'all'>('all');
  const [creating,setCreating]= useState(false);
  const [form, setForm] = useState({ name:'', eventType:'other' as CampaignEventType,
    significance:'minor' as EventSignificance, campaignDate:'', isPlayerFacing:true });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string|null>(null);

  type RawEvent = Record<string,unknown>;

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      const rows = await atlas.db.query<RawEvent>(
        'SELECT * FROM campaign_events WHERE campaign_id = ? ORDER BY campaign_date DESC, created_at DESC LIMIT 200',
        [campaign.id],
      );
      setEvents(rows.map(r => ({
        id: r['id'] as string, name: r['name'] as string,
        description: r['description'] as string ?? '',
        eventType: r['event_type'] as CampaignEventType,
        significance: r['significance'] as EventSignificance,
        campaignDate: r['campaign_date'] as string|null,
        certainty: r['certainty'] as CampaignEvent['certainty'],
        isPlayerFacing: r['is_player_facing'] === 1,
        locationId: r['location_id'] as string|null,
        questId: r['quest_id'] as string|null,
        plotThreadId: r['plot_thread_id'] as string|null,
        sessionId: r['session_id'] as string|null,
        tags: JSON.parse(r['tags'] as string ?? '[]') as string[],
        createdAt: r['created_at'] as string, updatedAt: r['updated_at'] as string,
        npcIds:[], factionIds:[], causedByEventIds:[], consequenceEventIds:[], assetIds:[],
      })));
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setLoading(false); }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    return atlas.on.moduleEvent(({ event }) => {
      if (event === 'timeline:entry-added') load();
    });
  }, [load]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !campaign) return;
    setSaving(true); setError(null);
    try {
      const id = crypto.randomUUID(), now = new Date().toISOString();
      await atlas.db.run(
        `INSERT INTO campaign_events
           (id,campaign_id,name,description,event_type,significance,campaign_date,
            certainty,is_player_facing,tags,created_at,updated_at)
         VALUES (?,?,?,?,'${form.eventType}','${form.significance}',?,\'exact\',?,\'[]\',?,?)`,
        [id, campaign.id, form.name.trim(), '', form.campaignDate||null, form.isPlayerFacing?1:0, now, now],
      );
      await load();
      setCreating(false);
      setForm(f => ({...f, name:'', campaignDate:''}));
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setSaving(false); }
  }

  const filtered = events.filter(ev => {
    if (filter !== 'all' && ev.eventType !== filter) return false;
    if (search && !ev.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const EVENT_TYPES: CampaignEventType[] = ['battle','political','discovery','death','birth','quest','faction','natural','social','mystery','other'];

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Timeline</h2>
          <span className={styles.count}>{events.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <input className={styles.search} placeholder="Search events…" value={search}
            onChange={e => setSearch(e.target.value)} />
          <button className={styles.createBtn} onClick={() => setCreating(v=>!v)}>
            <Icon name="plus" size={16}/> New Event
          </button>
        </div>
      </header>

      {creating && (
        <form className={styles.createBar} onSubmit={createEvent}>
          <input className={styles.input} autoFocus placeholder="Event name…"
            value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required/>
          <select className={styles.input} value={form.eventType}
            onChange={e => setForm(f=>({...f,eventType:e.target.value as CampaignEventType}))}>
            {EVENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select className={styles.input} value={form.significance}
            onChange={e => setForm(f=>({...f,significance:e.target.value as EventSignificance}))}>
            {(['trivial','minor','moderate','major','critical'] as EventSignificance[]).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <input className={styles.input} placeholder="In-world date (optional)"
            value={form.campaignDate} onChange={e => setForm(f=>({...f,campaignDate:e.target.value}))}/>
          <button type="submit" className={styles.createBtn} disabled={saving||!form.name.trim()}>
            {saving?<Icon name="loader" size={14} className={styles.spin}/>:null} Add
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => setCreating(false)}>Cancel</button>
        </form>
      )}

      <div className={styles.typeFilters}>
        <button className={`${styles.typeBtn} ${filter==='all'?styles.typeBtnActive:''}`}
          onClick={() => setFilter('all')}>All</button>
        {EVENT_TYPES.map(t => (
          <button key={t} className={`${styles.typeBtn} ${filter===t?styles.typeBtnActive:''}`}
            onClick={() => setFilter(t)} title={t}>
            {TYPE_GLYPH[t]}
          </button>
        ))}
      </div>

      {error && <div className={styles.errorBar}><Icon name="alert" size={15}/> {error}</div>}

      <div className={styles.body}>
        {loading ? (
          <div className={styles.empty}><Icon name="loader" size={24} className={styles.spin}/></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="clock" size={36} className={styles.emptyIcon}/>
            <p>No events recorded yet.</p>
            <p className={styles.emptyHint}>Events are created here or auto-logged when quests complete.</p>
          </div>
        ) : (
          <ul className={styles.eventList}>
            {filtered.map(ev => (
              <li key={ev.id} className={styles.eventItem}>
                <div className={styles.eventLeft}>
                  <span className={styles.glyph}>{TYPE_GLYPH[ev.eventType]}</span>
                  <div className={styles.line}/>
                </div>
                <div className={styles.eventBody}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventName}>{ev.name}</span>
                    <div className={styles.eventMeta}>
                      <span className={styles.sigDot} style={{background:SIG_COLOUR[ev.significance]}} title={ev.significance}/>
                      {ev.campaignDate && <span className={styles.date}>{ev.campaignDate}</span>}
                      <span className={styles.eventType}>{ev.eventType}</span>
                      {!ev.isPlayerFacing && <span className={styles.gmOnly}>GM</span>}
                    </div>
                  </div>
                  {ev.description && <p className={styles.eventDesc}>{ev.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
