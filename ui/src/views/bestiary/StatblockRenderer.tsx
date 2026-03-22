// ui/src/views/bestiary/StatblockRenderer.tsx
//
// Pure-render statblock component. Accepts a MonsterFull object and produces
// the full statblock layout with NO data fetching, NO edit controls, and NO
// app-chrome dependencies.
//
// Used by:
//   - MonsterDetail (replaces the inlined renderStatblock() helper)
//   - StatblockPrintModal (the print/export overlay)
//
// The component is intentionally isolated so the print modal can render it
// inside a detached DOM node without importing any Electron/bridge code.

import type { MonsterFull } from './MonsterDetail';
import styles from './StatblockRenderer.module.css';

// ── Internal types ────────────────────────────────────────────────────────────

interface ActionRow {
  name:         string;
  description:  string;
  attackBonus?: number;
  damage?:      string;
  recharge?:    string;
}

interface LegendaryRow extends ActionRow {
  cost: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function abilityMod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function fmtSpeed(m: MonsterFull): string {
  const parts: string[] = [`${m.speed} ft.`];
  const other = parseJson<Record<string, number>>(m.speed_other, {});
  for (const [k, v] of Object.entries(other)) {
    parts.push(`${k} ${v} ft.`);
  }
  return parts.join(', ');
}

function fmtSavingThrows(raw: string): string {
  const saves = parseJson<Record<string, number>>(raw, {});
  return Object.entries(saves)
    .map(([k, v]) => `${k.toUpperCase()} ${v >= 0 ? '+' : ''}${v}`)
    .join(', ');
}

function fmtSkills(raw: string): string {
  const sk = parseJson<Record<string, number>>(raw, {});
  return Object.entries(sk)
    .map(([k, v]) => `${k.charAt(0).toUpperCase()}${k.slice(1)} ${v >= 0 ? '+' : ''}${v}`)
    .join(', ');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBlock({ action }: { action: ActionRow }) {
  return (
    <div className={styles.blockItem}>
      <p className={styles.blockBody}>
        <span className={styles.blockName}>
          {action.name}
          {action.recharge ? ` (${action.recharge})` : ''}.{' '}
        </span>
        {action.description}
        {(action.attackBonus != null || action.damage) && (
          <span className={styles.blockAttack}>
            {' — '}
            {action.attackBonus != null && `+${action.attackBonus} to hit`}
            {action.attackBonus != null && action.damage && ' · '}
            {action.damage}
          </span>
        )}
      </p>
    </div>
  );
}

function LegendaryBlock({ action }: { action: LegendaryRow }) {
  return (
    <div className={styles.blockItem}>
      <p className={styles.blockBody}>
        <span className={styles.blockName}>
          {action.name}
          {action.cost > 1 ? ` (Costs ${action.cost} Actions)` : ''}.{' '}
        </span>
        {action.description}
      </p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.sbSection}>
      <div className={styles.sbHeading}>{children}</div>
    </div>
  );
}

// ── StatblockRenderer ─────────────────────────────────────────────────────────

interface Props {
  monster:      MonsterFull;
  /** When true, GM Notes (lore) are suppressed — useful for player-facing prints. */
  hideGmNotes?: boolean;
}

export function StatblockRenderer({ monster, hideGmNotes = false }: Props) {
  // Parse all JSON columns once at the top
  const traits           = parseJson<ActionRow[]>(monster.traits,          []);
  const actions          = parseJson<ActionRow[]>(monster.actions,         []);
  const bonusActions     = parseJson<ActionRow[]>(monster.bonus_actions,   []);
  const reactions        = parseJson<ActionRow[]>(monster.reactions,       []);
  const legendaryActions = parseJson<LegendaryRow[]>(monster.legendary_actions, []);
  const tags             = parseJson<string[]>(monster.tags,               []);
  const immunities       = parseJson<string[]>(monster.damage_immunities,       []);
  const resistances      = parseJson<string[]>(monster.damage_resistances,      []);
  const vulnerabilities  = parseJson<string[]>(monster.damage_vulnerabilities,  []);
  const condImm          = parseJson<string[]>(monster.condition_immunities,     []);

  const saves     = fmtSavingThrows(monster.saving_throws);
  const skillsFmt = fmtSkills(monster.skills);
  const speedStr  = fmtSpeed(monster);

  const typeLine = [
    capitalize(monster.size),
    monster.creature_type,
    monster.subtype ? `(${monster.subtype})` : null,
    monster.alignment,
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.statblock}>

      {/* ── Banner ─────────────────────────────────────────────── */}
      <div className={styles.banner}>
        <h1 className={styles.monsterName}>{monster.name}</h1>
        <p className={styles.typeLine}>{typeLine}</p>
      </div>

      <div className={styles.rulerGold} />

      {/* ── Core stats: AC / HP / Speed ───────────────────────── */}
      <div className={styles.sbSection}>
        <div className={styles.coreRow}>
          <div className={styles.coreStat}>
            <span className={styles.coreLabel}>Armour Class</span>
            <span className={styles.coreValue}>
              {monster.armor_class}
              {monster.armor_type ? ` (${monster.armor_type})` : ''}
            </span>
          </div>
          <div className={styles.coreStat}>
            <span className={styles.coreLabel}>Hit Points</span>
            <span className={styles.coreValue}>
              {monster.hit_points}
              {monster.hit_dice ? ` (${monster.hit_dice})` : ''}
            </span>
          </div>
          <div className={styles.coreStat}>
            <span className={styles.coreLabel}>Speed</span>
            <span className={styles.coreValue}>{speedStr}</span>
          </div>
        </div>
      </div>

      <div className={styles.rulerGold} />

      {/* ── Ability scores ────────────────────────────────────── */}
      <div className={styles.sbSection}>
        <div className={styles.abilityGrid}>
          {ABILITY_KEYS.map(k => {
            const score = (monster as unknown as Record<string, number>)[k] ?? 10;
            return (
              <div key={k} className={styles.abilityCell}>
                <span className={styles.abilityLabel}>{k.toUpperCase()}</span>
                <span className={styles.abilityScore}>{score}</span>
                <span className={styles.abilityMod}>{abilityMod(score)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.rulerGold} />

      {/* ── Properties: saves, skills, resistances, senses ────── */}
      <div className={styles.sbSection}>
        <div className={styles.propList}>
          {saves         && <PropRow label="Saving Throws"           value={saves} />}
          {skillsFmt     && <PropRow label="Skills"                  value={skillsFmt} />}
          {vulnerabilities.length > 0 && <PropRow label="Damage Vulnerabilities" value={vulnerabilities.join('; ')} />}
          {resistances.length   > 0   && <PropRow label="Damage Resistances"     value={resistances.join('; ')} />}
          {immunities.length    > 0   && <PropRow label="Damage Immunities"      value={immunities.join('; ')} />}
          {condImm.length       > 0   && <PropRow label="Condition Immunities"   value={condImm.join('; ')} />}
          {monster.senses       && <PropRow label="Senses"    value={monster.senses} />}
          {monster.languages    && <PropRow label="Languages" value={monster.languages} />}
        </div>
      </div>

      <div className={styles.rulerGold} />

      {/* ── CR / Proficiency ─────────────────────────────────── */}
      <div className={styles.sbSection}>
        <div className={styles.crRow}>
          <span className={styles.crLabel}>Challenge</span>
          <span className={styles.crValue}>{monster.challenge_rating}</span>
          {monster.xp_value > 0 && (
            <span className={styles.crXp}>({monster.xp_value.toLocaleString()} XP)</span>
          )}
          <span className={styles.crSep}>·</span>
          <span className={styles.crLabel}>Proficiency Bonus</span>
          <span className={styles.crValue}>+{monster.proficiency_bonus}</span>
        </div>
      </div>

      {/* ── Traits ───────────────────────────────────────────── */}
      {traits.length > 0 && (
        <>
          <div className={styles.rulerCrimson} />
          <div className={styles.sbSection}>
            <div className={styles.blockList}>
              {traits.map((t, i) => <ActionBlock key={i} action={t} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Actions ──────────────────────────────────────────── */}
      {actions.length > 0 && (
        <>
          <SectionHeading>Actions</SectionHeading>
          <div className={styles.sbSection}>
            <div className={styles.blockList}>
              {actions.map((a, i) => <ActionBlock key={i} action={a} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Bonus Actions ─────────────────────────────────────── */}
      {bonusActions.length > 0 && (
        <>
          <SectionHeading>Bonus Actions</SectionHeading>
          <div className={styles.sbSection}>
            <div className={styles.blockList}>
              {bonusActions.map((a, i) => <ActionBlock key={i} action={a} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Reactions ─────────────────────────────────────────── */}
      {reactions.length > 0 && (
        <>
          <SectionHeading>Reactions</SectionHeading>
          <div className={styles.sbSection}>
            <div className={styles.blockList}>
              {reactions.map((r, i) => <ActionBlock key={i} action={r} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Legendary Actions ─────────────────────────────────── */}
      {legendaryActions.length > 0 && (
        <>
          <SectionHeading>Legendary Actions</SectionHeading>
          <div className={styles.sbSection}>
            {monster.legendary_description && (
              <p className={styles.legendaryPreamble}>{monster.legendary_description}</p>
            )}
            <div className={styles.blockList}>
              {legendaryActions.map((la, i) => <LegendaryBlock key={i} action={la} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Description ───────────────────────────────────────── */}
      {monster.description && (
        <>
          <div className={styles.rulerCrimson} />
          <div className={styles.sbSection}>
            <div className={styles.sbHeading}>Description</div>
            <p className={styles.loreText}>{monster.description}</p>
          </div>
        </>
      )}

      {/* ── GM Notes (hidden when hideGmNotes=true) ─────────── */}
      {!hideGmNotes && monster.lore && (
        <>
          <div className={styles.rulerCrimson} />
          <div className={styles.sbSection}>
            <div className={styles.sbHeading}>GM Notes</div>
            <p className={styles.loreText}>{monster.lore}</p>
          </div>
        </>
      )}

      {/* ── Tags ──────────────────────────────────────────────── */}
      {tags.length > 0 && (
        <div className={`${styles.sbSection} ${styles.tagSection}`}>
          <div className={styles.tagList}>
            {tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        </div>
      )}

    </div>
  );
}

// Small inline helper to avoid repeating markup for each property row
function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.prop}>
      <span className={styles.propLabel}>{label}</span>
      <span className={styles.propValue}>{value}</span>
    </div>
  );
}
