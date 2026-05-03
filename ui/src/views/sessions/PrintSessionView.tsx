// ui/src/views/sessions/PrintSessionView.tsx
// Print preview modal for sessions.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PrintableEntityRef, PrintableScene, PrintableSession } from '../../types/print';
import styles from './PrintSessionView.module.css';

const TYPE_LABEL: Record<string, string> = {
  combat: 'Combat',
  roleplay: 'Roleplay',
  exploration: 'Exploration',
  puzzle: 'Puzzle',
  social: 'Social',
  rest: 'Rest / Downtime',
  revelation: 'Revelation',
  travel: 'Travel',
  other: 'Other',
};

const PRINT_TYPE_FIELDS: Record<string, { title: string; fields: { key: string; label: string }[] }> = {
  combat: { title: 'Combat Frame', fields: [
    { key: 'battlefield', label: 'Battlefield' }, { key: 'stakes', label: 'Stakes' }, { key: 'tactics', label: 'Enemy Tactics' }, { key: 'escalation', label: 'Escalation' },
  ] },
  roleplay: { title: 'Roleplay Beat', fields: [
    { key: 'speaker', label: 'Key Speaker' }, { key: 'agenda', label: 'Agenda' }, { key: 'leverage', label: 'Leverage' }, { key: 'reveal', label: 'Possible Reveal' },
  ] },
  exploration: { title: 'Exploration Site', fields: [
    { key: 'feature', label: 'Signature Feature' }, { key: 'discovery', label: 'Discovery' }, { key: 'hazard', label: 'Hazard' }, { key: 'clue', label: 'Clue / Lead' },
  ] },
  puzzle: { title: 'Puzzle Structure', fields: [
    { key: 'mechanism', label: 'Mechanism' }, { key: 'clue', label: 'Clue' }, { key: 'solution', label: 'Solution' }, { key: 'failure', label: 'Failure State' },
  ] },
  social: { title: 'Social Scene', fields: [
    { key: 'audience', label: 'Audience' }, { key: 'mood', label: 'Mood' }, { key: 'ask', label: 'Ask / Offer' }, { key: 'consequence', label: 'Consequence' },
  ] },
  rest: { title: 'Downtime Beat', fields: [
    { key: 'haven', label: 'Haven' }, { key: 'options', label: 'Downtime Options' }, { key: 'interruption', label: 'Interruption' }, { key: 'benefit', label: 'Benefit' },
  ] },
  revelation: { title: 'Revelation Beat', fields: [
    { key: 'truth', label: 'Truth' }, { key: 'delivery', label: 'Delivery' }, { key: 'evidence', label: 'Evidence' }, { key: 'reaction', label: 'Expected Reaction' },
  ] },
  other: { title: 'Custom Encounter Frame', fields: [
    { key: 'focus', label: 'Focus' }, { key: 'structure', label: 'Structure' }, { key: 'twist', label: 'Twist' }, { key: 'resolution', label: 'Resolution' },
  ] },
};

function labelForType(value: string): string {
  return TYPE_LABEL[value] ?? TYPE_LABEL.other;
}

function EntityTable({ title, rows }: { title: string; rows: PrintableEntityRef[] }) {
  return (
    <div className={styles.entityBlock}>
      <h4 className={styles.entityTitle}>{title}</h4>
      {rows.length === 0 ? (
        <p className={styles.entityEmpty}>None</p>
      ) : (
        <table className={styles.entityTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Count</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.id}`}>
                <td>{row.name}</td>
                <td>{row.count}</td>
                <td>{row.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TravelMontageBlock({ scene }: { scene: PrintableScene }) {
  const details = scene.typeDetails.travel;
  if (!details) return null;

  const rows = [
    ['Route / Region', details.route],
    ['Travel Goal', details.travelGoal],
    ['Montage Prompt', details.montagePrompt],
    ['Party Approach', details.partyApproach],
    ['Main Obstacle', details.obstacle],
    ['Complication', details.complication],
    ['Progress / Win State', details.progress],
    ['Cost / Consequence', details.consequence],
  ].filter(([, value]) => value.trim());

  if (rows.length === 0) return null;
  return (
    <div className={styles.typeDetail}>
      <h4 className={styles.entityTitle}>Travel Montage</h4>
      {rows.map(([label, value]) => (
        <p key={label}><strong>{label}:</strong> {value}</p>
      ))}
    </div>
  );
}

function EncounterTypeDetails({ scene }: { scene: PrintableScene }) {
  if (scene.encounterType === 'travel') return <TravelMontageBlock scene={scene} />;
  const config = PRINT_TYPE_FIELDS[scene.encounterType];
  const values = scene.typeDetails[scene.encounterType] as Record<string, string> | undefined;
  if (!config || !values) return null;
  const rows = config.fields
    .map(field => [field.label, values[field.key] ?? ''] as const)
    .filter(([, value]) => value.trim());

  if (rows.length === 0) return null;
  return (
    <div className={styles.typeDetail}>
      <h4 className={styles.entityTitle}>{config.title}</h4>
      {rows.map(([label, value]) => (
        <p key={label}><strong>{label}:</strong> {value}</p>
      ))}
    </div>
  );
}

function SceneBlock({ scene, index }: { scene: PrintableScene; index: number }) {
  return (
    <article className={styles.sceneBlock}>
      <div className={styles.sceneHeader}>
        <h3 className={styles.sceneTitle}>{index + 1}. {scene.title}</h3>
        <div className={styles.sceneMeta}>
          <span className={styles.typeChip}>{labelForType(scene.encounterType)}</span>
          <span>{scene.played ? 'Played' : 'Planned'}</span>
        </div>
      </div>
      {scene.objective && <p><strong>Objective:</strong> {scene.objective}</p>}
      {scene.setup && <p><strong>Setup:</strong> {scene.setup}</p>}
      {scene.reward && <p><strong>Reward:</strong> {scene.reward}</p>}
      <EncounterTypeDetails scene={scene} />
      <div className={styles.entityGrid}>
        <EntityTable title="NPCs" rows={scene.npcs} />
        <EntityTable title="Monsters" rows={scene.monsters} />
        <EntityTable title="Minis" rows={scene.minis} />
      </div>
    </article>
  );
}

function SessionPrintDocument({ session }: { session: PrintableSession }) {
  const formattedDate = session.scheduledAt
    ? new Date(session.scheduledAt).toLocaleString()
    : 'Unscheduled';

  return (
    <div className={styles.document}>
      <div className={styles.pageHeader}>
        <span>{session.title}</span>
        <span>{formattedDate}</span>
      </div>
      <div className={styles.pageFooter}>
        Page <span className={styles.pageNumber} /> / <span className={styles.pageTotal} />
      </div>

      <header className={styles.sessionHeader}>
        <h1 className={styles.sessionTitle}>{session.title}</h1>
        <div className={styles.sessionMeta}>
          <span>{formattedDate}</span>
          <span className={styles.statusChip}>{session.status}</span>
        </div>
        {session.description ? (
          <p className={styles.sessionDescription}>{session.description}</p>
        ) : (
          <p className={styles.sessionDescription}>No session summary provided.</p>
        )}
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Scenes</h2>
        {session.scenes.length === 0 ? (
          <p className={styles.emptyNote}>No scenes added.</p>
        ) : (
          <div className={styles.sceneList}>
            {session.scenes.map((scene, idx) => (
              <SceneBlock key={scene.id} scene={scene} index={idx} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Featured NPCs</h2>
        <EntityTable title="Session NPCs" rows={session.featuredNpcs} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Prep Items</h2>
        {session.prepItems.length === 0 ? (
          <p className={styles.emptyNote}>No prep items.</p>
        ) : (
          <ul className={styles.list}>
            {session.prepItems.map((item) => (
              <li key={item.id}>{item.done ? '[x]' : '[ ]'} {item.description}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Session Notes</h2>
        {session.notes.length === 0 ? (
          <p className={styles.emptyNote}>No notes.</p>
        ) : (
          <ul className={styles.list}>
            {session.notes.map((note) => (
              <li key={note.id}><strong>{note.phase}:</strong> {note.content}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface Props {
  session: PrintableSession;
  onClose: () => void;
}

export function PrintSessionView({ session, onClose }: Props) {
  const printRootRef = useRef<HTMLDivElement | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const id = 'alaruel-session-print-styles';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = '/session-print.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    document.getElementById('session-print-root')?.remove();
    const div = document.createElement('div');
    div.id = 'session-print-root';
    document.body.appendChild(div);
    printRootRef.current = div;
    return () => {
      div.remove();
      printRootRef.current = null;
      document.body.classList.remove('printing-session');
    };
  }, []);

  useEffect(() => {
    const onAfterPrint = () => {
      document.body.classList.remove('printing-session');
      setPrinting(false);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  function handlePrint() {
    setPrinting(true);
    document.body.classList.add('printing-session');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  return (
    <>
      <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={styles.modal}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.toolbarTitle}>Session Print Preview</span>
              <span className={styles.toolbarSession}>{session.title}</span>
            </div>
            <div className={styles.toolbarRight}>
              <button className={styles.printBtn} onClick={handlePrint} disabled={printing}>
                {printing ? 'Preparing...' : 'Print'}
              </button>
              <button className={styles.closeBtn} onClick={onClose}>Close</button>
            </div>
          </div>
          <div className={styles.preview}>
            <SessionPrintDocument session={session} />
          </div>
        </div>
      </div>

      {printRootRef.current && createPortal(
        <SessionPrintDocument session={session} />,
        printRootRef.current,
      )}
    </>
  );
}
