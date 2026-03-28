// ui/src/views/bestiary/StatblockPrintModal.tsx
//
// Print preview modal + print trigger for a single monster statblock.
//
// ARCHITECTURE
// ─────────────
// A React portal renders into a dedicated <div id="statblock-print-root">
// that lives directly on document.body (outside the React #root entirely).
//
// @media print  →  statblock-print.css hides every body child EXCEPT
//                  #statblock-print-root, so the statblock fills the page.
// @media screen →  #statblock-print-root is display:none, so it is fully
//                  invisible outside this modal's lifetime.
//
// The modal itself (overlay, preview card, controls) lives inside the
// normal React tree and is hidden at print time via .noprint CSS.
//
// This means:
//   - No changes to AppShell or any other layout component.
//   - No duplication of monster data — we receive MonsterFull from the caller.
//   - Closing the modal unmounts the portal and removes the print root node.

import { useEffect, useRef, useState }   from 'react';
import { createPortal }                  from 'react-dom';
import { Icon }                          from '../../components/ui/Icon';
import type { MonsterFull }              from './MonsterDetail';
import { StatblockPrintView }            from './StatblockPrintView';
import styles                            from './StatblockPrintModal.module.css';

// ── StatblockPrintModal ───────────────────────────────────────────────────────

interface Props {
  monster:  MonsterFull;
  onClose:  () => void;
}

export function StatblockPrintModal({ monster, onClose }: Props) {
  const printRootRef                   = useRef<HTMLDivElement | null>(null);
  const [hideGmNotes, setHideGmNotes] = useState(false);
  const [printing,    setPrinting]    = useState(false);

  // Create the out-of-tree print root once on mount
  useEffect(() => {
    // Remove any leftover from a previous session (should not happen, but safe)
    document.getElementById('statblock-print-root')?.remove();

    const div = document.createElement('div');
    div.id    = 'statblock-print-root';
    document.body.appendChild(div);
    printRootRef.current = div;

    return () => {
      div.remove();
      printRootRef.current = null;
      document.body.classList.remove('printing-statblock');
    };
  }, []);

  // Trap Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onAfterPrint = () => {
      document.body.classList.remove('printing-statblock');
      setPrinting(false);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  function handlePrint() {
    setPrinting(true);
    document.body.classList.add('printing-statblock');
    // Small rAF delay ensures the portal DOM is flushed before print dialog opens
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  return (
    <>
      {/* ── Screen overlay (hidden at print time via .noprint) ─── */}
      <div className={`${styles.overlay} noprint`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={styles.modal}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>
              <Icon name="scroll" size={16} />
              Print Statblock
            </div>
            <div className={styles.modalControls}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  className={styles.toggleCheck}
                  checked={hideGmNotes}
                  onChange={e => setHideGmNotes(e.target.checked)}
                />
                Hide GM Notes
              </label>
              <button className={styles.btnClose} onClick={onClose} title="Close">
                <Icon name="x" size={15} />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className={styles.preview}>
            <div className={styles.previewPage}>
              <StatblockPrintView monster={monster} hideGmNotes={hideGmNotes} />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.modalFooter}>
            <span className={styles.footerHint}>
              <Icon name="check" size={12} /> GM Notes are {hideGmNotes ? 'hidden' : 'included'} · A4 · Portrait
            </span>
            <div className={styles.footerActions}>
              <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
              <button
                className={styles.btnPrint}
                onClick={handlePrint}
                disabled={printing}
              >
                <Icon name="upload" size={14} />
                {printing ? 'Sending to printer…' : 'Print / Save PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Out-of-tree print portal (visible ONLY at @media print) ── */}
      {printRootRef.current && createPortal(
        <StatblockPrintView monster={monster} hideGmNotes={hideGmNotes} />,
        printRootRef.current,
      )}
    </>
  );
}
