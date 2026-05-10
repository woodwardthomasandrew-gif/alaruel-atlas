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
import {
  formatAbilityMod,
  formatMod,
  ABILITY_KEYS,
  ABILITY_FULL_NAMES,
  SKILL_DEFS,
  SPELLCASTING_MODULE_LABELS,
  calcSpellSaveDC,
  calcSpellAttackBonus,
  formatListSummary,
  skillBonus,
  type SkillConfig,
  type SkillKey,
} from './monsterCalc';
import type { SpellcastingModule } from '../../../../shared/src/types/monster';
import { formatMovementSpeedLine } from '../../../../shared/src/utils/movement';
import styles from './StatblockRenderer.module.css';

// ── Internal types ────────────────────────────────────────────────────────────

interface ActionRow {
  name:         string;
  description:  string;
  attackBonus?: number;
  damage?:      string;
  recharge?:    string;
  spellcasting?: SpellcastingModule;
}

interface LegendaryRow extends ActionRow {
  cost: number;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ');
}

function normalizeInlineText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinFormattedList(values: string[], separator = '; '): string {
  return values.map(v => normalizeInlineText(v)).filter(Boolean).join(separator);
}

function fmtSavingThrows(raw: string): string {
  const saves = parseJson<Record<string, number>>(raw, {});
  return Object.entries(saves)
    .map(([k, v]) => `${k.toUpperCase()} ${v >= 0 ? '+' : ''}${v}`)
    .join(', ');
}

function splitSpellcastingTraits(actions: ActionRow[]): { traits: ActionRow[]; modules: SpellcastingModule[] } {
  const traits: ActionRow[] = [];
  const modules: SpellcastingModule[] = [];
  for (const action of actions) {
    if (action.spellcasting) modules.push(action.spellcasting);
    else traits.push(action);
  }
  return { traits, modules };
}

function fmtSkills(raw: string, abilityScores: Record<string, number>, profBonus: number): string {
  const sk = parseJson<Record<string, number | SkillConfig>>(raw, {});
  const keys = SKILL_DEFS.map(def => def.key).filter(key => sk[key] !== undefined);
  return keys
    .map(key => {
      const def = SKILL_DEFS.find(item => item.key === key)!;
      const value = skillBonus(key as SkillKey, abilityScores[def.abilityKey], profBonus, sk[key]);
      return `${def.label} ${value >= 0 ? '+' : ''}${value}`;
    })
    .join(', ');
}

function renderSpellcastingModule(module: SpellcastingModule, profBonus: number, abilityScores: Record<string, number>) {
  const score = abilityScores[module.spellcastingAbility] ?? 10;
  const dc = module.spellSaveDcOverride ?? calcSpellSaveDC(score, profBonus);
  const atk = module.spellAttackBonusOverride ?? calcSpellAttackBonus(score, profBonus);
  const lines: string[] = [];

  if (module.notes) lines.push(module.notes.trim());

  switch (module.kind) {
    case 'spellcasting':
      lines.push(`The creature's spellcasting ability is ${ABILITY_FULL_NAMES[module.spellcastingAbility]} (spell save DC ${dc}, ${formatMod(atk)} to hit with spell attacks).`);
      break;
    case 'innate_spellcasting':
      lines.push(`The creature's innate spellcasting ability is ${ABILITY_FULL_NAMES[module.spellcastingAbility]} (spell save DC ${dc}, ${formatMod(atk)} to hit with spell attacks).`);
      break;
    case 'psionics':
      lines.push(`The creature's psionic ability is ${ABILITY_FULL_NAMES[module.spellcastingAbility]} (spell save DC ${dc}, ${formatMod(atk)} to hit with spell attacks).`);
      break;
    case 'ritual_casting':
      lines.push(`The creature can cast rituals using ${ABILITY_FULL_NAMES[module.spellcastingAbility]} (spell save DC ${dc}, ${formatMod(atk)} to hit with spell attacks).`);
      break;
  }

  if (module.spellSlots) lines.push(`Spell Slots: ${module.spellSlots}.`);
  if (module.preparedSpells) lines.push(`Prepared Spells: ${formatListSummary(module.preparedSpells)}.`);
  if (module.atWillSpells) lines.push(`At Will: ${formatListSummary(module.atWillSpells)}.`);
  if (module.dailySpells) lines.push(`Daily: ${formatListSummary(module.dailySpells)}.`);
  if (module.ritualTags) lines.push(`Ritual Tags: ${formatListSummary(module.ritualTags)}.`);

  return (
    <div className={styles.blockItem}>
      <p className={styles.blockBody}>
        <span className={styles.blockName}>{SPELLCASTING_MODULE_LABELS[module.kind]}. </span>
        {lines.join(' ')}
      </p>
    </div>
  );
}


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

function StatLine({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.statLine} ${className}`.trim()}>
      <span className={styles.statLabel}>{label}:</span>
      <span className={styles.statValue}>{value}</span>
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
  const traitParse       = splitSpellcastingTraits(parseJson<ActionRow[]>(monster.traits, []));
  const traits           = traitParse.traits;
  const spellcastingMods  = traitParse.modules;
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
  const skillsFmt = fmtSkills(monster.skills, {
    str: monster.str,
    dex: monster.dex,
    con: monster.con,
    int: monster.int,
    wis: monster.wis,
    cha: monster.cha,
  }, monster.proficiency_bonus);
  const speedStr  = formatMovementSpeedLine(monster.speed, parseJson<Record<string, unknown>>(monster.speed_other, {}));

  const typeLine = [
    titleCase(monster.size),
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
          <StatLine
            label="Armour Class"
            value={(
              <>
                {monster.armor_class}
                {monster.armor_type ? ` (${monster.armor_type})` : ''}
              </>
            )}
          />
          <StatLine
            label="Hit Points"
            value={(
              <>
                {monster.hit_points}
                {monster.hit_dice ? ` (${monster.hit_dice})` : ''}
              </>
            )}
          />
          <StatLine label="Speed" value={speedStr} />
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
                <span className={styles.abilityMod}>{formatAbilityMod(score)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.rulerGold} />

      {/* ── Properties: saves, skills, resistances, senses ────── */}
      <div className={styles.sbSection}>
        <div className={styles.propList}>
          {saves && <PropRow label="Saving Throws" value={saves} />}
          {skillsFmt && <PropRow label="Skills" value={skillsFmt} />}
          {vulnerabilities.length > 0 && <PropRow label="Damage Vulnerabilities" value={joinFormattedList(vulnerabilities)} />}
          {resistances.length > 0 && <PropRow label="Damage Resistances" value={joinFormattedList(resistances)} />}
          {immunities.length > 0 && <PropRow label="Damage Immunities" value={joinFormattedList(immunities)} />}
          {condImm.length > 0 && <PropRow label="Condition Immunities" value={joinFormattedList(condImm)} />}
          {monster.senses && <PropRow label="Senses" value={normalizeInlineText(monster.senses)} />}
          {monster.languages && <PropRow label="Languages" value={normalizeInlineText(monster.languages)} />}
        </div>
      </div>

      <div className={styles.rulerGold} />

      {/* ── CR / Proficiency ─────────────────────────────────── */}
      <div className={styles.sbSection}>
        <div className={styles.crRow}>
          <span className={styles.crLabel}>Challenge:</span>
          <span className={styles.crValue}>{monster.challenge_rating}</span>
          {monster.xp_value > 0 && (
            <span className={styles.crXp}>({monster.xp_value.toLocaleString()} XP)</span>
          )}
          <span className={styles.crSep}>·</span>
          <span className={styles.crLabel}>Proficiency Bonus:</span>
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

      {spellcastingMods.length > 0 && (
        <>
          <SectionHeading>Spellcasting Modules</SectionHeading>
          <div className={styles.sbSection}>
            <div className={styles.blockList}>
              {spellcastingMods.map(module => renderSpellcastingModule(module, monster.proficiency_bonus, {
                str: monster.str,
                dex: monster.dex,
                con: monster.con,
                int: monster.int,
                wis: monster.wis,
                cha: monster.cha,
              }))}
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
      <span className={styles.propLabel}>{label}:</span>
      <span className={styles.propValue}>{value}</span>
    </div>
  );
}
