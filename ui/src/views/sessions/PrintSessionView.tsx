// ui/src/views/sessions/PrintSessionView.tsx
// Printer-friendly view of a resolved session.
// Rendered alongside (not replacing) the existing SessionsView.

import { useEffect, useRef } from 'react';
import type { PrintableSession, PrintableEncounter, PrintableMonster } from '../../types/print';
import styles from './PrintSessionView.module.css';

// ── Encounter type labels (mirrors SessionsView) ────────────────────────────

const TYPE_LABEL: Record<string, { icon: string; label: string }> = {
  combat:      { icon: '⚔️',  label: 'Combat' },
  roleplay:    { icon: '💬',  label: 'Roleplay' },
  exploration: { icon: '🗺️', label: 'Exploration' },
  puzzle:      { icon: '🧩',  label: 'Puzzle' },
  social:      { icon: '🤝',  label: 'Social' },
  rest:        { icon: '🏕️', label: 'Rest / Downtime' },
  revelation:  { icon: '💡',  label: 'Revelation' },
  travel:      { icon: '🛤️', label: 'Travel' },
  other:       { icon: '📌',  label: 'Other' },
};

function typeInfo(val: string) {
  return TYPE_LABEL[val] ?? TYPE_LABEL.other;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MonsterStatblock({ monster }: { monster: PrintableMonster }) {
  return (
    <div className={styles.statblock}>
      <div className={styles.statblockHeader}>
        <span className={styles.statblockName}>{monster.name}</span>
        <span className={styles.statblockQty}>×{monster.quantity}</span>
      </div>
      {monster.statblock ? (
        <pre className={styles.statblockBody}>{monster.statblock}</pre>
      ) : (
        <p className={styles.statblockEmpty}>No statblock recorded.</p>
      )}
    </div>
  );
}

function EncounterBlock({ enc, index }: { enc: PrintableEncounter; index: number }) {
  const info = typeInfo(enc.encounterType);

  return (
    <div className={styles.encounterBlock}>
      <div className={styles.encounterHeading}>
        <span className={styles.encounterIndex}>{index + 1}</span>
        <span className={styles.encounterTitle}>{enc.title}</span>
        <span className={styles.encounterType}>{info.icon} {info.label}</span>
        {enc.played && <span className={styles.encounterPlayed}>✓ Played</span>}
      </div>

      {enc.objective && (
        <div className={styles.field}>
          <dt>Objective</dt>
          <dd>{enc.objective}</dd>
        </div>
      )}

      {enc.monsters.length > 0 && (
        <div className={styles.field}>
          <dt>Monsters</dt>
          <dd>
            <ul className={styles.monsterList}>
              {enc.monsters.map((m, i) => (
                <li key={i}>{m.quantity > 1 ? `${m.quantity}× ` : ''}{m.name}</li>
              ))}
            </ul>
          </dd>
        </div>
      )}

      {enc.setup && (
        <div className={styles.field}>
          <dt>Notes</dt>
          <dd><pre className={styles.preWrap}>{enc.setup}</pre></dd>
        </div>
      )}

      {enc.reward && (
        <div className={styles.field}>
          <dt>Reward / Outcome</dt>
          <dd>{enc.reward}</dd>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  session: PrintableSession;
  onClose: () => void;
}

export function PrintSessionView({ session, onClose }: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Inject the print stylesheet once when the component mounts
  useEffect(() => {
    const id = 'alaruel-print-styles';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id   = id;
      link.rel  = 'stylesheet';
      link.href = '/print.css'; // served from public/ — see print.css file
      document.head.appendChild(link);
    }
  }, []);

  function handlePrint() {
    window.print();
  }

  const formattedDate = session.sessionDate
    ? new Date(session.sessionDate).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <div className={styles.overlay}>
      {/* Toolbar — hidden on print via CSS */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.toolbarTitle}>Print Preview</span>
          <span className={styles.toolbarSession}>{session.title}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.printBtn} onClick={handlePrint}>
            🖨 Print
          </button>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* Print area — this is what actually prints */}
      <div ref={printAreaRef} className={styles.printArea} id="alaruel-print-area">

        {/* ── Session header ─────────────────────────────────────────── */}
        <header className={styles.sessionHeader}>
          <h1 className={styles.sessionTitle}>{session.title}</h1>
          <div className={styles.sessionMeta}>
            {formattedDate && <span>{formattedDate}</span>}
            <span className={styles.sessionStatus}>{session.status}</span>
          </div>
          {session.summary && (
            <p className={styles.sessionSummary}>{session.summary}</p>
          )}
        </header>

        {/* ── Encounters ─────────────────────────────────────────────── */}
        {session.encounters.length > 0 ? (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Encounters</h2>
            <div className={styles.encounterList}>
              {session.encounters.map((enc, idx) => (
                <EncounterBlock key={enc.id} enc={enc} index={idx} />
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Encounters</h2>
            <p className={styles.emptyNote}>No encounters planned for this session.</p>
          </section>
        )}

        {/* ── Statblocks ─────────────────────────────────────────────── */}
        {session.allMonsters.length > 0 && (
          <section className={styles.section + ' ' + styles.statblocksSection}>
            <h2 className={styles.sectionTitle}>Statblocks</h2>
            <p className={styles.statblockIntro}>
              All monsters appearing in this session ({session.allMonsters.length} unique).
            </p>
            <div className={styles.statblockGrid}>
              {session.allMonsters.map((m, i) => (
                <MonsterStatblock key={i} monster={m} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
