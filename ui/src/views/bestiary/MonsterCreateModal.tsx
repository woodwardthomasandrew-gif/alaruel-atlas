// ui/src/views/bestiary/MonsterCreateModal.tsx
// Minimal "new monster" form — only the fields needed to get started.
// All other fields are edited in the full detail panel.
//
// Uses individual useState per field (matching NpcCreateModal pattern)
// and a real <form onSubmit> element for reliable controlled input behaviour.

import { useState } from 'react';
import { atlas }    from '../../bridge/atlas';
import { proficiencyFromCR, xpFromCR } from './monsterCalc';
import styles       from './MonsterCreateModal.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const CREATURE_TYPES = [
  'aberration','beast','celestial','construct','dragon','elemental',
  'fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead','custom',
] as const;

const SIZES = ['tiny','small','medium','large','huge','gargantuan'] as const;

const CR_OPTIONS = [
  '0','1/8','1/4','1/2',
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  onCreated:  (id: string, name: string) => void;
  onClose:    () => void;
}

export function MonsterCreateModal({ campaignId, onCreated, onClose }: Props) {
  // Individual state per field — same pattern as NpcCreateModal
  const [name,            setName]            = useState('');
  const [creatureType,    setCreatureType]    = useState('monstrosity');
  const [size,            setSize]            = useState('medium');
  const [challengeRating, setChallengeRating] = useState('1');
  const [armorClass,      setArmorClass]      = useState('10');
  const [hitPoints,       setHitPoints]       = useState('10');
  const [walkSpeed,       setWalkSpeed]       = useState('30');
  const [isHomebrew,      setIsHomebrew]      = useState(true);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) { setError('Name is required.'); return; }

    const ac = parseInt(armorClass, 10);
    const hp = parseInt(hitPoints,  10);
    if (isNaN(ac) || ac < 0) { setError('Armour Class must be a non-negative number.'); return; }
    if (isNaN(hp) || hp < 1) { setError('Hit Points must be at least 1.');              return; }

    setSaving(true);
    setError(null);

    try {
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();

      // Derive PB and XP automatically from CR
      const pb = proficiencyFromCR(challengeRating);
      const xp = xpFromCR(challengeRating);

      await atlas.db.run(
        `INSERT INTO monsters (
           id, campaign_id, name, description,
           creature_type, size, alignment,
           armor_class, hit_points, speed,
           str, dex, con, int, wis, cha,
           proficiency_bonus, challenge_rating, xp_value,
           saving_throws, skills,
           damage_vulnerabilities, damage_resistances,
           damage_immunities, condition_immunities,
           speed_other, traits, actions, reactions,
           legendary_actions, bonus_actions,
           habitat_location_ids, is_homebrew, tags,
           created_at, updated_at
         ) VALUES (
           ?, ?, ?, ?,
           ?, ?, ?,
           ?, ?, ?,
           ?, ?, ?, ?, ?, ?,
           ?, ?, ?,
           ?, ?,
           ?, ?,
           ?, ?,
           ?, ?, ?, ?,
           ?, ?,
           ?, ?, ?,
           ?, ?
         )`,
        [
          id, campaignId, trimmedName, '',
          creatureType, size, 'true neutral',
          ac, hp, Math.max(0, parseInt(walkSpeed, 10) || 0),
          10, 10, 10, 10, 10, 10,
          pb, challengeRating, xp,
          '{}', '{}',
          '[]', '[]',
          '[]', '[]',
          '{}', '[]', '[]', '[]',
          '[]', '[]',
          '[]', isHomebrew ? 1 : 0, '[]',
          now, now,
        ],
      );

      onCreated(id, trimmedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        <h2 className={styles.title}>New Monster</h2>

        <form className={styles.form} onSubmit={handleSubmit}>

          {/* Name */}
          <div className={styles.group}>
            <label className={styles.label} htmlFor="mc-name">Name *</label>
            <input
              id="mc-name"
              className={styles.input}
              placeholder="e.g. Shadow Drake"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Type + Size */}
          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="mc-type">Type</label>
              <select
                id="mc-type"
                className={styles.select}
                value={creatureType}
                onChange={e => setCreatureType(e.target.value)}
              >
                {CREATURE_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="mc-size">Size</label>
              <select
                id="mc-size"
                className={styles.select}
                value={size}
                onChange={e => setSize(e.target.value)}
              >
                {SIZES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CR + AC + HP */}
          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="mc-cr">Challenge Rating</label>
              <select
                id="mc-cr"
                className={styles.select}
                value={challengeRating}
                onChange={e => setChallengeRating(e.target.value)}
              >
                {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{cr}</option>)}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="mc-speed">Walk Speed</label>
              <input
                id="mc-speed"
                className={styles.input}
                type="number"
                min={0}
                value={walkSpeed}
                onChange={e => setWalkSpeed(e.target.value)}
              />
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="mc-ac">Armour Class</label>
              <input
                id="mc-ac"
                className={styles.input}
                type="number"
                min={0}
                max={99}
                value={armorClass}
                onChange={e => setArmorClass(e.target.value)}
              />
            </div>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="mc-hp">Hit Points</label>
              <input
                id="mc-hp"
                className={styles.input}
                type="number"
                min={1}
                max={999999}
                value={hitPoints}
                onChange={e => setHitPoints(e.target.value)}
              />
            </div>
          </div>

          {/* Auto-calc preview */}
          <p className={styles.calcPreview}>
            CR {challengeRating}
            {' '}→{' '}
            Proficiency Bonus +{proficiencyFromCR(challengeRating)}
            {xpFromCR(challengeRating) > 0
              ? ` · ${xpFromCR(challengeRating).toLocaleString()} XP`
              : ''}
          </p>

          {/* Homebrew */}
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={isHomebrew}
              onChange={e => setIsHomebrew(e.target.checked)}
            />
            Homebrew monster
          </label>

          {/* Error */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnCreate}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Creating…' : 'Create Monster'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
