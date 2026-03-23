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
import { formatAbilityMod, ABILITY_KEYS } from './monsterCalc';

// ── Helpers (duplicated from StatblockRenderer to keep components isolated) ──

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

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function fmtSpeed(m: MonsterFull): string {
  const parts: string[] = [`${m.speed} ft.`];
  const other = parseJson<Record<string, number>>(m.speed_other, {});
  for (const [k, v] of Object.entries(other)) parts.push(`${k} ${v} ft.`);
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

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }


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

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sb-prop">
      <span className="sb-prop-label">{label} </span>
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
    cap(monster.size),
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
          <div className="sb-core-stat">
            <span className="sb-core-label">Armour Class</span>
            <span className="sb-core-value">
              {monster.armor_class}
              {monster.armor_type ? ` (${monster.armor_type})` : ''}
            </span>
          </div>
          <div className="sb-core-stat">
            <span className="sb-core-label">Hit Points</span>
            <span className="sb-core-value">
              {monster.hit_points}
              {monster.hit_dice ? ` (${monster.hit_dice})` : ''}
            </span>
          </div>
          <div className="sb-core-stat">
            <span className="sb-core-label">Speed</span>
            <span className="sb-core-value">{speedStr}</span>
          </div>
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
          {saves                    && <PropRow label="Saving Throws"           value={saves} />}
          {skillsFmt                && <PropRow label="Skills"                  value={skillsFmt} />}
          {vulnerabilities.length>0 && <PropRow label="Damage Vulnerabilities" value={vulnerabilities.join('; ')} />}
          {resistances.length   >0  && <PropRow label="Damage Resistances"     value={resistances.join('; ')} />}
          {immunities.length    >0  && <PropRow label="Damage Immunities"       value={immunities.join('; ')} />}
          {condImm.length       >0  && <PropRow label="Condition Immunities"   value={condImm.join('; ')} />}
          {monster.senses           && <PropRow label="Senses"                 value={monster.senses} />}
          {monster.languages        && <PropRow label="Languages"              value={monster.languages} />}
        </div>
      </div>

      <div className="sb-ruler-gold" />

      {/* ── CR / Proficiency ────────────────────────────────────── */}
      <div className="sb-section">
        <div className="sb-cr-row">
          <span className="sb-cr-label">Challenge</span>
          <span className="sb-cr-value">{monster.challenge_rating}</span>
          {monster.xp_value > 0 && (
            <span className="sb-cr-xp">({monster.xp_value.toLocaleString()} XP)</span>
          )}
          <span className="sb-cr-sep">·</span>
          <span className="sb-cr-label">Proficiency Bonus</span>
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
