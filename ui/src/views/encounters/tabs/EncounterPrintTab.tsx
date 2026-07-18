import { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import type { Encounter, EncounterMonster, EncounterMini } from '../../../types/encounter';
import { EncounterPrintModal } from './EncounterPrintModal';
import styles from '../EncounterDetail.module.css';

interface Props { encounter: Encounter; monsters: EncounterMonster[]; minis: EncounterMini[]; }

export function EncounterPrintTab({ encounter, monsters, minis }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.form}>
      <p>
        Print the encounter sheet (details, roster, rewards, and notes) together with a miniature
        pull list for gathering physical minis before the session. Monster cards and initiative
        cards are planned for a future pass.
      </p>
      <button className={styles.saveBtn} onClick={() => setOpen(true)}>
        <Icon name="upload" size={14}/> Print Encounter
      </button>
      {open && (
        <EncounterPrintModal encounter={encounter} monsters={monsters} minis={minis}
          onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
