// ui/src/views/bestiary/StatblockPrintView.tsx
//
// Renders a statblock using STABLE global class names (sb-*) instead of CSS
// Modules. This is necessary because statblock-print.css is a global stylesheet
// served from /public and cannot reference hashed CSS Module class names.
//
// Both the preview (inside StatblockPrintModal) and the print portal use this
// component, so what you see in the preview is exactly what prints.
//
// Class naming convention: sb-{block-name} matching statblock-print.css

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
} from './monsterCalc';
import type { SpellcastingModule } from '../../../../shared/src/types/monster';
import { formatMovementSpeedLine } from '../../../../shared/src/utils/movement';

// ── Helpers (duplicated from StatblockRenderer to keep components isolated) ──

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
  return SKILL_DEFS
    .filter(def => sk[def.key] !== undefined)
    .map(def => {
      const value = skillBonus(def.key, abilityScores[def.abilityKey], profBonus, sk[def.key]);
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
    <div className="sb-block-item">
      <p className="sb-block-body">
        <span className="sb-block-name">{SPELLCASTING_MODULE_LABELS[module.kind]}. </span>
        {lines.join(' ')}
      </p>
    </div>
  );
}


// ── Sub-renders ───────────────────────────────────────────────────────────────

function ActionBlock({ action }: { action: ActionRow }) {
  return (
    <div className="sb-block-item">
      <p className="sb-block-body">
        <span className="sb-block-name">
          {action.name}
          {action.recharge ? ` (${action.recharge})` : ''}.{' '}
        </span>
        {action.description}
        {(action.attackBonus != null || action.damage) && (
          <span className="sb-block-attack">
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
    <div className="sb-block-item">
      <p className="sb-block-body">
        <span className="sb-block-name">
          {action.name}
          {action.cost > 1 ? ` (Costs ${action.cost} Actions)` : ''}.{' '}
        </span>
        {action.description}
      </p>
    </div>
  );
}

function SbHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="sb-section">
      <div className="sb-heading">{children}</div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="sb-stat-line">
      <span className="sb-stat-label">{label}:</span>
      <span className="sb-stat-value">{value}</span>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sb-prop">
      <span className="sb-prop-label">{label}:</span>
      <span className="sb-prop-value">{value}</span>
    </div>
  );
}

// ── StatblockPrintView ────────────────────────────────────────────────────────

interface Props {
  monster:      MonsterFull;
  hideGmNotes?: boolean;
}

export function StatblockPrintView({ monster, hideGmNotes = false }: Props) {
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
    <div className="sb-card">

      {/* ── Banner ──────────────────────────────────────────────── */}
      <div className="sb-banner">
        <h1 className="sb-monster-name">{monster.name}</h1>
        <p className="sb-type-line">{typeLine}</p>
      </div>

      <div className="sb-ruler-gold" />

      {/* ── Core: AC / HP / Speed ───────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-core-row">
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

      <div className="sb-ruler-gold" />

      {/* ── Ability scores ──────────────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-ability-grid">
          {ABILITY_KEYS.map(k => {
            const score = (monster as unknown as Record<string, number>)[k] ?? 10;
            return (
              <div key={k} className="sb-ability-cell">
                <span className="sb-ability-label">{k.toUpperCase()}</span>
                <span className="sb-ability-score">{score}</span>
                <span className="sb-ability-mod">{formatAbilityMod(score)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sb-ruler-gold" />

      {/* ── Properties ──────────────────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-prop-list">
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

      <div className="sb-ruler-gold" />

      {/* ── CR / Proficiency ────────────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-cr-row">
          <span className="sb-cr-label">Challenge:</span>
          <span className="sb-cr-value">{monster.challenge_rating}</span>
          {monster.xp_value > 0 && (
            <span className="sb-cr-xp">({monster.xp_value.toLocaleString()} XP)</span>
          )}
          <span className="sb-cr-sep">·</span>
          <span className="sb-cr-label">Proficiency Bonus:</span>
          <span className="sb-cr-value">+{monster.proficiency_bonus}</span>
        </div>
      </div>

      {/* ── Traits ──────────────────────────────────────────────── */}
      {traits.length > 0 && (
        <>
          <div className="sb-ruler-crimson" />
          <div className="sb-section">
            <div className="sb-block-list">
              {traits.map((t, i) => <ActionBlock key={i} action={t} />)}
            </div>
          </div>
        </>
      )}

      {spellcastingMods.length > 0 && (
        <>
          <SbHeading>Spellcasting Modules</SbHeading>
          <div className="sb-section">
            <div className="sb-block-list">
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

      {/* ── Actions ─────────────────────────────────────────────── */}
      {actions.length > 0 && (
        <>
          <SbHeading>Actions</SbHeading>
          <div className="sb-section">
            <div className="sb-block-list">
              {actions.map((a, i) => <ActionBlock key={i} action={a} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Bonus Actions ───────────────────────────────────────── */}
      {bonusActions.length > 0 && (
        <>
          <SbHeading>Bonus Actions</SbHeading>
          <div className="sb-section">
            <div className="sb-block-list">
              {bonusActions.map((a, i) => <ActionBlock key={i} action={a} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Reactions ───────────────────────────────────────────── */}
      {reactions.length > 0 && (
        <>
          <SbHeading>Reactions</SbHeading>
          <div className="sb-section">
            <div className="sb-block-list">
              {reactions.map((r, i) => <ActionBlock key={i} action={r} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Legendary Actions ───────────────────────────────────── */}
      {legendaryActions.length > 0 && (
        <>
          <SbHeading>Legendary Actions</SbHeading>
          <div className="sb-section">
            {monster.legendary_description && (
              <p className="sb-legendary-preamble">{monster.legendary_description}</p>
            )}
            <div className="sb-block-list">
              {legendaryActions.map((la, i) => <LegendaryBlock key={i} action={la} />)}
            </div>
          </div>
        </>
      )}

      {/* ── Description ─────────────────────────────────────────── */}
      {monster.description && (
        <>
          <div className="sb-ruler-crimson" />
          <div className="sb-section">
            <div className="sb-heading">Description</div>
            <p className="sb-lore-text">{monster.description}</p>
          </div>
        </>
      )}

      {/* ── GM Notes (suppressed when hideGmNotes=true) ─────────── */}
      {!hideGmNotes && monster.lore && (
        <>
          <div className="sb-ruler-crimson" />
          <div className="sb-section">
            <div className="sb-heading">GM Notes</div>
            <p className="sb-lore-text">{monster.lore}</p>
          </div>
        </>
      )}

      {/* ── Tags (hidden in print via .sb-tags CSS rule) ─────────── */}
      {tags.length > 0 && (
        <div className="sb-section sb-tags">
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {tags.map(t => (
              <span key={t} style={{ fontSize:10, border:'1px solid #ccc', borderRadius:20, padding:'1px 8px' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Homebrew badge ───────────────────────────────────────── */}
      {Boolean(monster.is_homebrew) && (
        <div className="sb-homebrew-badge">Homebrew</div>
      )}
    </div>
  );
}
