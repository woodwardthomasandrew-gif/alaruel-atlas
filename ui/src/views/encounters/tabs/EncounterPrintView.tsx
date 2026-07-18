import type { Encounter, EncounterMonster, EncounterMini } from '../../../types/encounter';
import styles from './EncounterPrintView.module.css';

interface Props { encounter: Encounter; monsters: EncounterMonster[]; minis: EncounterMini[]; }

export function EncounterPrintView({ encounter, monsters, minis }: Props) {
  const pullList = minis.filter(m => m.assignment !== 'missing' && m.miniId);
  const missing  = minis.filter(m => m.assignment === 'missing');

  return (
    <div className={`ep-card ${styles.card}`}>
      {/* ── Encounter Sheet ─────────────────────────────────────────── */}
      <header className={`ep-banner ${styles.banner}`}>
        <h1 className={`ep-title ${styles.title}`}>{encounter.name}</h1>
        <p className={`ep-subtitle ${styles.subtitle}`}>
          {encounter.encounterType.replace('_', ' ')} · {encounter.difficulty}
          {encounter.location ? ` · ${encounter.location}` : ''}
          {encounter.sessionNumber ? ` · Session ${encounter.sessionNumber}` : ''}
        </p>
      </header>

      {encounter.description && (
        <section className={`ep-section ${styles.section}`}>
          <p className={`ep-body ${styles.body}`}>{encounter.description}</p>
        </section>
      )}

      <section className={`ep-section ${styles.section}`}>
        <h2 className={`ep-heading ${styles.heading}`}>Enemy Roster</h2>
        {monsters.length === 0 ? <p className={`ep-body ${styles.body}`}>No creatures recorded.</p> : (
          <table className={styles.table}>
            <thead><tr><th>Creature</th><th>Qty</th><th>Group</th><th>Notes</th></tr></thead>
            <tbody>
              {monsters.map(m => (
                <tr key={m.id}>
                  <td>{m.customName || m.monsterName || m.monsterId}</td>
                  <td>{m.quantity}</td>
                  <td>{m.groupLabel ?? ''}</td>
                  <td>{m.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {(encounter.loot || encounter.xpAward || encounter.storyRewards || encounter.reputationRewards) && (
        <section className={`ep-section ${styles.section}`}>
          <h2 className={`ep-heading ${styles.heading}`}>Rewards</h2>
          {!!encounter.xpAward && <p className={`ep-body ${styles.body}`}><strong>XP:</strong> {encounter.xpAward}</p>}
          {encounter.loot && <p className={`ep-body ${styles.body}`}><strong>Loot:</strong> {encounter.loot}</p>}
          {encounter.storyRewards && <p className={`ep-body ${styles.body}`}><strong>Story:</strong> {encounter.storyRewards}</p>}
          {encounter.reputationRewards && <p className={`ep-body ${styles.body}`}><strong>Reputation:</strong> {encounter.reputationRewards}</p>}
        </section>
      )}

      {encounter.notes && (
        <section className={`ep-section ${styles.section}`}>
          <h2 className={`ep-heading ${styles.heading}`}>Notes</h2>
          <p className={`ep-body ${styles.body}`}>{encounter.notes}</p>
        </section>
      )}

      {/* ── Miniature Pull List ─────────────────────────────────────── */}
      <section className={`ep-section ${styles.section} ${styles.pageBreak} ep-page-break`}>
        <h2 className={`ep-heading ${styles.heading}`}>Miniature Pull List</h2>
        {pullList.length === 0 ? <p className={`ep-body ${styles.body}`}>No minis assigned.</p> : (
          <table className={styles.table}>
            <thead><tr><th>Mini</th><th>Qty</th><th>Type</th></tr></thead>
            <tbody>
              {pullList.map(m => (
                <tr key={m.id}>
                  <td>{m.miniName ?? m.miniId}</td>
                  <td>{m.quantity}</td>
                  <td>{m.assignment === 'proxy' ? 'proxy' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {missing.length > 0 && (
          <p className={`ep-body ${styles.body}`}>
            <strong>Missing:</strong> {missing.reduce((n, m) => n + m.quantity, 0)} creature(s) have no mini assigned.
          </p>
        )}
      </section>
    </div>
  );
}
