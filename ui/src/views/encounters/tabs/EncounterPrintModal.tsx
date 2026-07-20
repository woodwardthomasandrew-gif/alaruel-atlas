// ui/src/views/encounters/tabs/EncounterPrintModal.tsx
//
// Print preview modal + print trigger for an Encounter Sheet + Miniature
// Pull List + Monster/Item Cards. Follows the same out-of-tree portal
// pattern as StatblockPrintModal: a dedicated #encounter-print-root lives on
// document.body, hidden on screen and shown only for @media print via
// public/encounter-print.css.

import { useEffect, useRef, useState } from 'react';
import { createPortal }                from 'react-dom';
import { Icon }                        from '../../../components/ui/Icon';
import { atlas }                       from '../../../bridge/atlas';
import type { Encounter, EncounterMonster, EncounterMini, EncounterItem } from '../../../types/encounter';
import type { MonsterFull }            from '../../bestiary/MonsterDetail';
import type { MagicItemRow }           from '../../magic-items/MagicItemsView';
import { EncounterPrintView }          from './EncounterPrintView';
import styles                          from './EncounterPrintModal.module.css';

interface Props {
  encounter: Encounter;
  monsters:  EncounterMonster[];
  minis:     EncounterMini[];
  items:     EncounterItem[];
  onClose:   () => void;
}

export function EncounterPrintModal({ encounter, monsters, minis, items, onClose }: Props) {
  const printRootRef            = useRef<HTMLDivElement | null>(null);
  const [printing, setPrinting] = useState(false);
  const [monsterFullById, setMonsterFullById] = useState<Record<string, MonsterFull>>({});
  const [itemFullById,    setItemFullById]    = useState<Record<string, MagicItemRow>>({});

  useEffect(() => {
    document.getElementById('encounter-print-root')?.remove();
    const div = document.createElement('div');
    div.id    = 'encounter-print-root';
    document.body.appendChild(div);
    printRootRef.current = div;
    return () => {
      div.remove();
      printRootRef.current = null;
      document.body.classList.remove('printing-encounter');
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onAfterPrint = () => { document.body.classList.remove('printing-encounter'); setPrinting(false); };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  // Load full monster + item rows for the card printout (roster/rewards only
  // carry the lightweight joined fields needed for tables).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const monsterIds = Array.from(new Set(monsters.map(m => m.monsterId)));
      const itemIds    = Array.from(new Set(items.map(i => i.itemId)));

      const [monsterRows, itemRows] = await Promise.all([
        monsterIds.length
          ? atlas.db.query<MonsterFull>(
              `SELECT * FROM monsters WHERE id IN (${monsterIds.map(() => '?').join(',')})`,
              monsterIds,
            )
          : Promise.resolve([] as MonsterFull[]),
        itemIds.length
          ? atlas.db.query<MagicItemRow>(
              `SELECT * FROM magic_items WHERE id IN (${itemIds.map(() => '?').join(',')})`,
              itemIds,
            )
          : Promise.resolve([] as MagicItemRow[]),
      ]);

      if (cancelled) return;
      setMonsterFullById(Object.fromEntries(monsterRows.map(m => [m.id, m])));
      setItemFullById(Object.fromEntries(itemRows.map(i => [i.id, i])));
    })();
    return () => { cancelled = true; };
  }, [monsters, items]);

  function handlePrint() {
    setPrinting(true);
    document.body.classList.add('printing-encounter');
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  return (
    <>
      <div className={`${styles.overlay} noprint`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}><Icon name="scroll" size={16}/> Print Encounter</div>
            <button className={styles.btnClose} onClick={onClose} title="Close"><Icon name="x" size={15}/></button>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewPage}>
              <EncounterPrintView encounter={encounter} monsters={monsters} minis={minis} items={items}
                monsterFullById={monsterFullById} itemFullById={itemFullById}/>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <span className={styles.footerHint}>
              <Icon name="check" size={12}/> Encounter Sheet + Pull List + Monster/Item Cards · A4 · Portrait
            </span>
            <div className={styles.footerActions}>
              <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
              <button className={styles.btnPrint} onClick={handlePrint} disabled={printing}>
                <Icon name="upload" size={14}/> {printing ? 'Sending to printer…' : 'Print / Save PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {printRootRef.current && createPortal(
        <EncounterPrintView encounter={encounter} monsters={monsters} minis={minis} items={items}
          monsterFullById={monsterFullById} itemFullById={itemFullById}/>,
        printRootRef.current,
      )}
    </>
  );
}
