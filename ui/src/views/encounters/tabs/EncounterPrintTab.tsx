import { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import type { Encounter, EncounterMonster, EncounterMini, EncounterItem } from '../../../types/encounter';
import { EncounterPrintModal } from './EncounterPrintModal';
import styles from '../EncounterDetail.module.css';

interface Props {
  encounter: Encounter;
  monsters:  EncounterMonster[];
  minis:     EncounterMini[];
  items:     EncounterItem[];
}

export function EncounterPrintTab({ encounter, monsters, minis, items }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.form}>
      <p>
        Print the encounter sheet (details, roster, rewards, and notes) together with a miniature
        pull list, full monster statblock cards, and reward item cards for gathering everything
        before the session. Cards tile onto the page and grow to fit large statblocks.
      </p>
      <button className={styles.saveBtn} onClick={() => setOpen(true)}>
        <Icon name="upload" size={14}/> Print Encounter
      </button>
      {open && (
        <EncounterPrintModal encounter={encounter} monsters={monsters} minis={minis} items={items}
          onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
