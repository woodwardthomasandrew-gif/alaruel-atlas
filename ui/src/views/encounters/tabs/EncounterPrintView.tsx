import type { Encounter, EncounterMonster, EncounterMini, EncounterItem } from '../../../types/encounter';
import type { MonsterFull }   from '../../bestiary/MonsterDetail';
import type { MagicItemRow }  from '../../magic-items/MagicItemsView';
import { StatblockPrintView } from '../../bestiary/StatblockPrintView';
import { MagicItemPrintView } from '../../magic-items/MagicItemPrintView';
import styles from './EncounterPrintView.module.css';

interface Props {
  encounter: Encounter;
  monsters:  EncounterMonster[];
  minis:     EncounterMini[];
  items:     EncounterItem[];
  /** Full monster rows (all statblock fields), keyed by monsterId — used for the tiled monster cards. */
  monsterFullById: Record<string, MonsterFull>;
  /** Full magic item rows, keyed by itemId — used for the tiled reward item cards. */
  itemFullById:    Record<string, MagicItemRow>;
}

export function EncounterPrintView({
  encounter, monsters, minis, items, monsterFullById, itemFullById,
}: Props) {
  const pullList = minis.filter(m => m.assignment !== 'missing' && m.miniId);
  const missing  = minis.filter(m => m.assignment === 'missing');

  // One card per unique monster in the roster (not per creature) — a group
  // of 4 goblins gets one card with a ×4 badge, not four identical cards.
  const monsterCardEntries = Array.from(
    monsters.reduce((map, m) => {
      const existing = map.get(m.monsterId);
      map.set(m.monsterId, (existing ?? 0) + m.quantity);
      return map;
    }, new Map<string, number>()),
  ).filter(([monsterId]) => monsterFullById[monsterId]);

  const itemCardEntries = Array.from(
    items.reduce((map, it) => {
      const existing = map.get(it.itemId);
      map.set(it.itemId, (existing ?? 0) + it.quantity);
      return map;
    }, new Map<string, number>()),
  ).filter(([itemId]) => itemFullById[itemId]);

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

      {(encounter.loot || encounter.xpAward || encounter.storyRewards || encounter.reputationRewards || items.length > 0) && (
        <section className={`ep-section ${styles.section}`}>
          <h2 className={`ep-heading ${styles.heading}`}>Rewards</h2>
          {!!encounter.xpAward && <p className={`ep-body ${styles.body}`}><strong>XP:</strong> {encounter.xpAward}</p>}
          {encounter.loot && <p className={`ep-body ${styles.body}`}><strong>Loot:</strong> {encounter.loot}</p>}
          {items.length > 0 && (
            <p className={`ep-body ${styles.body}`}>
              <strong>Item Cards:</strong> {items.map(it => `${it.customName || it.itemName || it.itemId}${it.quantity > 1 ? ` ×${it.quantity}` : ''}`).join(', ')}
              {' '}(full cards below)
            </p>
          )}
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

      {/* ── Monster Cards ───────────────────────────────────────────── */}
      {monsterCardEntries.length > 0 && (
        <section className={`ep-section ${styles.pageBreak} ep-page-break`}>
          <h2 className={`ep-heading ${styles.heading}`}>Monster Cards</h2>
          <div className="ep-card-grid">
            {monsterCardEntries.map(([monsterId, qty]) => (
              <div key={monsterId} className="ep-card-tile">
                {qty > 1 && <span className="ep-card-qty">×{qty}</span>}
                <StatblockPrintView monster={monsterFullById[monsterId]!} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Reward Item Cards ───────────────────────────────────────── */}
      {itemCardEntries.length > 0 && (
        <section className={`ep-section ${styles.pageBreak} ep-page-break`}>
          <h2 className={`ep-heading ${styles.heading}`}>Reward Item Cards</h2>
          <div className="ep-card-grid">
            {itemCardEntries.map(([itemId, qty]) => (
              <div key={itemId} className="ep-card-tile">
                {qty > 1 && <span className="ep-card-qty">×{qty}</span>}
                <MagicItemPrintView item={itemFullById[itemId]!} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
