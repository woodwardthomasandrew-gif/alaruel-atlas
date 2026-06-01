// ui/src/views/magic-items/MagicItemPrintModal.tsx
// Print preview modal + print trigger for a single magic item card.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/ui/Icon';
import type { MagicItemRow } from './MagicItemsView';
import { MagicItemPrintView } from './MagicItemPrintView';
import styles from './MagicItemPrintModal.module.css';

interface Props {
  item: MagicItemRow;
  onClose: () => void;
}

export function MagicItemPrintModal({ item, onClose }: Props) {
  const printRootRef = useRef<HTMLDivElement | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const id = 'alaruel-magic-item-print-styles';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = '/magic-item-print.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    document.getElementById('magic-item-print-root')?.remove();
    const div = document.createElement('div');
    div.id = 'magic-item-print-root';
    document.body.appendChild(div);
    printRootRef.current = div;
    return () => {
      div.remove();
      printRootRef.current = null;
      document.body.classList.remove('printing-magic-item');
    };
  }, []);

  useEffect(() => {
    const onAfterPrint = () => {
      document.body.classList.remove('printing-magic-item');
      setPrinting(false);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  function handlePrint() {
    setPrinting(true);
    document.body.classList.add('printing-magic-item');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  return (
    <>
      <div className={`${styles.overlay} noprint`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>
              <Icon name="scroll" size={16} />
              Print Magic Item
            </div>
            <div className={styles.modalControls}>
              <button className={styles.btnClose} onClick={onClose} title="Close">
                <Icon name="x" size={15} />
              </button>
            </div>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewPage}>
              <MagicItemPrintView item={item} />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <span className={styles.footerHint}>
              <Icon name="check" size={12} /> A4 · Portrait · Print or save as PDF
            </span>
            <div className={styles.footerActions}>
              <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
              <button className={styles.btnPrint} onClick={handlePrint} disabled={printing}>
                <Icon name="upload" size={14} />
                {printing ? 'Sending to printer…' : 'Print / Save PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {printRootRef.current && createPortal(
        <MagicItemPrintView item={item} />,
        printRootRef.current,
      )}
    </>
  );
}
