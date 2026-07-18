// ui/src/views/encounters/tabs/EncounterPrintModal.tsx
//
// Print preview modal + print trigger for an Encounter Sheet + Miniature
// Pull List. Follows the same out-of-tree portal pattern as
// StatblockPrintModal: a dedicated #encounter-print-root lives on
// document.body, hidden on screen and shown only for @media print via
// public/encounter-print.css.

import { useEffect, useRef, useState } from 'react';
import { createPortal }                from 'react-dom';
import { Icon }                        from '../../../components/ui/Icon';
import type { Encounter, EncounterMonster, EncounterMini } from '../../../types/encounter';
import { EncounterPrintView }          from './EncounterPrintView';
import styles                          from './EncounterPrintModal.module.css';

interface Props {
  encounter: Encounter;
  monsters:  EncounterMonster[];
  minis:     EncounterMini[];
  onClose:   () => void;
}

export function EncounterPrintModal({ encounter, monsters, minis, onClose }: Props) {
  const printRootRef            = useRef<HTMLDivElement | null>(null);
  const [printing, setPrinting] = useState(false);

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
              <EncounterPrintView encounter={encounter} monsters={monsters} minis={minis}/>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <span className={styles.footerHint}><Icon name="check" size={12}/> Encounter Sheet + Mini Pull List · A4 · Portrait</span>
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
        <EncounterPrintView encounter={encounter} monsters={monsters} minis={minis}/>,
        printRootRef.current,
      )}
    </>
  );
}
