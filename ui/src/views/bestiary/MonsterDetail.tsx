// ui/src/views/bestiary/MonsterDetail.tsx
// Full statblock view + inline editor for a selected monster.

import { useState, useEffect, useRef } from 'react';
import { Icon }                  from '../../components/ui/Icon';
import { atlas }                 from '../../bridge/atlas';
import { StatblockRenderer }     from './StatblockRenderer';
import { StatblockPrintModal }   from './StatblockPrintModal';
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  ABILITY_FULL_NAMES,
  SPELLCASTING_ABILITIES,
  formatAbilityMod,
  formatMod,
  abilityModifier,
  proficiencyFromCR,
  xpFromCR,
  calcAttackBonus,
  calcSpellSaveDC,
  calcSpellAttackBonus,
  computeSavingThrows,
  inferSaveConfigs,
  hitDieForSize,
  calcAverageHp,
  buildHitDiceString,
  groupPresets,
  fillPresetDescription,
  type AbilityKey,
  type SaveThrowConfigs,
  type ActionPreset,
  type ActionPresetCategory,
} from './monsterCalc';
import styles from './MonsterDetail.module.css';

// ── Local types (raw DB row shape) ────────────────────────────────────────────

interface ActionRow {
  name:         string;
  description:  string;
  // Existing field — treated as manual override when set
  attackBonus?: number;
  damage?:      string;
  recharge?:    string;
  // New calc fields (optional — existing stored JSON remains valid)
  abilityKey?:          AbilityKey;
  proficient?:          boolean;
  damageBonusOverride?: number;
}
interface LegendaryRow extends ActionRow { cost: number; }

export interface MonsterFull {
  id:                     string;
  campaign_id:            string;
  name:                   string;
  description:            string;
  creature_type:          string;
  subtype:                string | null;
  size:                   string;
  alignment:              string;
  armor_class:            number;
  armor_type:             string | null;
  hit_points:             number;
  hit_dice:               string | null;
  speed:                  number;
  speed_other:            string;
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
  proficiency_bonus:      number;
  challenge_rating:       string;
  xp_value:               number;
  saving_throws:          string;
  skills:                 string;
  damage_vulnerabilities: string;
  damage_resistances:     string;
  damage_immunities:      string;
  condition_immunities:   string;
  senses:                 string | null;
  languages:              string | null;
  traits:                 string;
  actions:                string;
  reactions:              string;
  legendary_actions:      string;
  legendary_description:  string | null;
  bonus_actions:          string;
  lore:                   string | null;
  image_asset_id:         string | null;
  habitat_location_ids:   string;
  is_homebrew:            number;
  tags:                   string;
  created_at:             string;
  updated_at:             string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const ALIGNMENTS = [
  'lawful good','neutral good','chaotic good',
  'lawful neutral','true neutral','chaotic neutral',
  'lawful evil','neutral evil','chaotic evil',
  'unaligned','any',
];
const CREATURE_TYPES = [
  'aberration','beast','celestial','construct','dragon','elemental',
  'fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead','custom',
];
const SIZES = ['tiny','small','medium','large','huge','gargantuan'];
const CR_OPTIONS = [
  '0','1/8','1/4','1/2',
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
];

// ── Calc-aware Action Editor ───────────────────────────────────────────────────

interface ActionEditorProps {
  label:       string;
  actions:     ActionRow[];
  onChange:    (actions: ActionRow[]) => void;
  legendary?:  boolean;
  profBonus:   number;
  abilityScores: Record<AbilityKey, number>;
}

function ActionEditor({ label, actions, onChange, legendary, profBonus, abilityScores }: ActionEditorProps) {
  function update(i: number, field: string, value: unknown) {
    onChange(actions.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  }
  function add() {
    onChange([...actions, {
      name: '', description: '',
      abilityKey: 'str', proficient: true,
      ...(legendary ? { cost: 1 } : {}),
    }]);
  }
  function remove(i: number) { onChange(actions.filter((_, idx) => idx !== i)); }

  return (
    <div>
      <div className={styles.formSectionTitle}>{label}</div>
      <div className={styles.actionList}>
        {actions.map((a, i) => {
          const abilityKey = a.abilityKey ?? 'str';
          const isProficient = a.proficient ?? true;
          const score = abilityScores[abilityKey] ?? 10;
          // Computed attack bonus; existing attackBonus field acts as override
          const computedAtk = calcAttackBonus(score, isProficient, profBonus);
          const hasAtkOverride = a.attackBonus !== undefined && a.attackBonus !== null && a.attackBonus !== ('' as unknown);
          const displayAtk = hasAtkOverride ? a.attackBonus! : computedAtk;
          // Computed damage bonus
          const computedDmgBonus = abilityModifier(score);
          const hasDmgOverride = a.damageBonusOverride !== undefined;
          const displayDmgBonus = hasDmgOverride ? a.damageBonusOverride! : computedDmgBonus;

          return (
            <div key={i} className={styles.actionItem}>
              {/* Name + remove */}
              <div className={styles.actionItemHeader}>
                <input
                  className={styles.actionItemTitle}
                  placeholder="Name"
                  value={a.name}
                  onChange={e => update(i, 'name', e.target.value)}
                />
                <button className={styles.removeBtn} onClick={() => remove(i)} title="Remove">
                  <Icon name="x" size={14} />
                </button>
              </div>

              {/* Description */}
              <textarea
                className={styles.actionItemDesc}
                placeholder="Description / effect"
                value={a.description}
                onChange={e => update(i, 'description', e.target.value)}
              />

              {/* Attack calc row */}
              <div className={styles.calcRow}>
                {/* Ability used */}
                <div className={styles.calcCell}>
                  <span className={styles.calcLabel}>Ability</span>
                  <select
                    className={styles.calcSelect}
                    value={abilityKey}
                    onChange={e => {
                      update(i, 'abilityKey', e.target.value as AbilityKey);
                      // Clear override when ability changes so calc re-runs
                      update(i, 'attackBonus', undefined);
                      update(i, 'damageBonusOverride', undefined);
                    }}
                  >
                    {ABILITY_KEYS.map(k => (
                      <option key={k} value={k}>{ABILITY_LABELS[k]}</option>
                    ))}
                  </select>
                </div>

                {/* Proficient checkbox */}
                <div className={styles.calcCell}>
                  <span className={styles.calcLabel}>Prof.</span>
                  <label className={styles.calcCheck}>
                    <input
                      type="checkbox"
                      checked={isProficient}
                      onChange={e => {
                        update(i, 'proficient', e.target.checked);
                        update(i, 'attackBonus', undefined); // clear override on toggle
                      }}
                    />
                  </label>
                </div>

                {/* Attack bonus — shows computed value, override on edit */}
                <div className={styles.calcCell}>
                  <span className={styles.calcLabel}>
                    Atk Bonus {!hasAtkOverride && <span className={styles.calcAuto}>auto</span>}
                  </span>
                  <div className={styles.calcInputWrap}>
                    <input
                      className={`${styles.calcInput} ${!hasAtkOverride ? styles.calcInputAuto : ''}`}
                      type="number"
                      value={String(displayAtk)}
                      onChange={e => {
                        const v = e.target.value;
                        update(i, 'attackBonus', v === '' ? undefined : Number(v));
                      }}
                      placeholder={String(computedAtk)}
                    />
                    {hasAtkOverride && (
                      <button
                        className={styles.calcResetBtn}
                        title="Reset to calculated value"
                        onClick={() => update(i, 'attackBonus', undefined)}
                      >↺</button>
                    )}
                  </div>
                </div>

                {/* Damage bonus */}
                <div className={styles.calcCell}>
                  <span className={styles.calcLabel}>
                    Dmg Bonus {!hasDmgOverride && <span className={styles.calcAuto}>auto</span>}
                  </span>
                  <div className={styles.calcInputWrap}>
                    <input
                      className={`${styles.calcInput} ${!hasDmgOverride ? styles.calcInputAuto : ''}`}
                      type="number"
                      value={String(displayDmgBonus)}
                      onChange={e => {
                        const v = e.target.value;
                        update(i, 'damageBonusOverride', v === '' ? undefined : Number(v));
                      }}
                      placeholder={String(computedDmgBonus)}
                    />
                    {hasDmgOverride && (
                      <button
                        className={styles.calcResetBtn}
                        title="Reset to calculated value"
                        onClick={() => update(i, 'damageBonusOverride', undefined)}
                      >↺</button>
                    )}
                  </div>
                </div>

                {/* Damage dice + recharge */}
                <div className={styles.calcCell} style={{ flex: 2 }}>
                  <span className={styles.calcLabel}>Damage</span>
                  <input
                    className={styles.calcInput}
                    placeholder={`e.g. 2d6${formatMod(displayDmgBonus)}`}
                    value={a.damage ?? ''}
                    onChange={e => update(i, 'damage', e.target.value)}
                  />
                </div>

                <div className={styles.calcCell}>
                  <span className={styles.calcLabel}>Recharge</span>
                  <input
                    className={styles.calcInput}
                    placeholder="5–6"
                    value={a.recharge ?? ''}
                    onChange={e => update(i, 'recharge', e.target.value)}
                  />
                </div>

                {legendary && (
                  <div className={styles.calcCell} style={{ maxWidth: 52 }}>
                    <span className={styles.calcLabel}>Cost</span>
                    <input
                      className={styles.calcInput}
                      type="number" min={1} max={3}
                      value={(a as LegendaryRow).cost ?? 1}
                      onChange={e => update(i, 'cost', Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* Preset picker + blank add */}
        <ActionPresetPicker
          profBonus={profBonus}
          abilityScores={abilityScores}
          legendary={legendary}
          onSelect={preset => {
            const abilityKey = preset.abilityKey;
            const score      = abilityScores[abilityKey] ?? 10;
            const atkBonus   = calcAttackBonus(score, preset.proficient, profBonus);
            const dmgBonus   = abilityModifier(score);
            const dmgDice    = preset.damageDice ?? '';
            const spellDc    = calcSpellSaveDC(score, profBonus);
            const description = fillPresetDescription(
              preset.description, atkBonus, dmgBonus, dmgDice, spellDc
            );
            onChange([...actions, {
              name:        preset.name,
              description,
              abilityKey:  preset.abilityKey,
              proficient:  preset.proficient,
              damage:      preset.damageDice ?? '',
              recharge:    preset.recharge,
              ...(legendary ? { cost: 1 } : {}),
            }]);
          }}
          onBlank={add}
          label={label}
        />
      </div>
    </div>
  );
}

// ── Preset picker ──────────────────────────────────────────────────────────────

interface PresetPickerProps {
  profBonus:     number;
  abilityScores: Record<AbilityKey, number>;
  legendary?:    boolean;
  onSelect:      (preset: ActionPreset) => void;
  onBlank:       () => void;
  label:         string;
}

function ActionPresetPicker({ onSelect, onBlank, label }: PresetPickerProps) {
  const [open, setOpen] = useState(false);
  const groups  = groupPresets(presetCategoriesForLabel(label));
  const hasPresets = groups.size > 0;
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the dropdown
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className={styles.presetPickerWrap}>
      <button className={styles.addBtn} style={{ flex: 1 }} onClick={onBlank}>
        <Icon name="plus" size={13} /> Blank {label.replace(/s$/, '')}
      </button>
      {hasPresets && <div className={styles.presetDropWrap} ref={wrapRef}>
        <button
          className={styles.presetBtn}
          onClick={() => setOpen(v => !v)}
          title="Add from preset"
        >
          <Icon name="chevron-down" size={13} /> Preset
        </button>
        {open && (
          <div className={styles.presetMenu}>
            {Array.from(groups.entries()).map(([cat, presets]) => (
              <div key={cat}>
                <div className={styles.presetCat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </div>
                {presets.map((p, i) => (
                  <button
                    key={i}
                    className={styles.presetItem}
                    onClick={() => { onSelect(p); setOpen(false); }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}

// ── Tag editor ────────────────────────────────────────────────────────────────

function presetCategoriesForLabel(label: string): ActionPresetCategory[] {
  switch (label) {
    case 'Traits':
      return ['trait'];
    case 'Actions':
      return ['melee', 'ranged', 'special', 'spellcasting'];
    case 'Bonus Actions':
      return ['bonus'];
    case 'Legendary Actions':
      return ['legendary'];
    case 'Reactions':
      return ['reaction'];
    default:
      return ['melee', 'ranged', 'special', 'trait', 'bonus', 'reaction', 'legendary', 'spellcasting'];
  }
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  function add() {
    const t = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  }
  function remove(t: string) { onChange(tags.filter(x => x !== t)); }
  return (
    <div className={styles.tagEditor}>
      {tags.map(t => (
        <span key={t} className={styles.tagChip}>
          {t}
          <button className={styles.tagChipRemove} onClick={() => remove(t)}>×</button>
        </span>
      ))}
      <input
        className={styles.tagInput}
        placeholder="Add tag…"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
      />
      {input.trim() && (
        <button className={styles.addBtn} style={{ width: 'auto', padding: '.25rem .5rem' }} onClick={add}>
          <Icon name="plus" size={12} /> Add
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  monsterId: string | null;
  onUpdated: (id: string, name: string, cr: string) => void;
  onDeleted: (id: string) => void;
}

export function MonsterDetail({ monsterId, onUpdated, onDeleted }: Props) {
  const [monster,   setMonster]   = useState<MonsterFull | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [linkedMinis, setLinkedMinis] = useState<{ id: string; name: string; base_size: string | null }[]>([]);

  // ── Edit form state ─────────────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<MonsterFull> & {
    actions_arr:          ActionRow[];
    traits_arr:           ActionRow[];
    reactions_arr:        ActionRow[];
    legendaryActions_arr: LegendaryRow[];
    bonusActions_arr:     ActionRow[];
    tags_arr:             string[];
  }>({
    actions_arr: [], traits_arr: [], reactions_arr: [],
    legendaryActions_arr: [], bonusActions_arr: [], tags_arr: [],
  });

  // ── Automation state ────────────────────────────────────────────────────────

  // Whether CR change should auto-update PB and XP
  const [autoPb,  setAutoPb]  = useState(true);
  const [autoXp,  setAutoXp]  = useState(true);

  // HP automation
  const [autoHp,       setAutoHp]       = useState(false);
  const [hpDiceCount,  setHpDiceCount]  = useState(1);
  const [hpDieSidesOverride, setHpDieSidesOverride] = useState<number | null>(null);

  // Saving throw proficiency configuration (per-ability)
  const [saveConfigs, setSaveConfigs] = useState<SaveThrowConfigs>({});

  // Spellcasting
  const [spellcastingAbility,   setSpellcastingAbility]   = useState<AbilityKey>('int');
  const [spellSaveDcOverride,   setSpellSaveDcOverride]   = useState<number | undefined>(undefined);
  const [spellAtkBonusOverride, setSpellAtkBonusOverride] = useState<number | undefined>(undefined);

  // ── Load monster when selection changes ──────────────────────────────────────
  useEffect(() => {
    if (!monsterId) { setMonster(null); return; }
    setLoading(true);
    setError(null);
    atlas.db.query<MonsterFull>(
      'SELECT * FROM monsters WHERE id = ?',
      [monsterId],
    ).then(rows => {
      const m = rows[0] ?? null;
      setMonster(m);
      if (m) populateForm(m);
    }).catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));

    // Load linked minis (read-only, for the statblock view)
    atlas.db.query<{ id: string; name: string; base_size: string | null }>(
      `SELECT m.id, m.name, m.base_size
       FROM minis m
       JOIN mini_monsters mm ON mm.mini_id = m.id
       WHERE mm.monster_id = ?
       ORDER BY m.name ASC`,
      [monsterId],
    ).then(setLinkedMinis).catch(() => {});
  }, [monsterId]);

  function populateForm(m: MonsterFull) {
    setForm({
      ...m,
      actions_arr:          parseJson<ActionRow[]>(m.actions, []),
      traits_arr:           parseJson<ActionRow[]>(m.traits, []),
      reactions_arr:        parseJson<ActionRow[]>(m.reactions, []),
      legendaryActions_arr: parseJson<LegendaryRow[]>(m.legendary_actions, []),
      bonusActions_arr:     parseJson<ActionRow[]>(m.bonus_actions, []),
      tags_arr:             parseJson<string[]>(m.tags, []),
    });
    // Reconstruct saving throw configs from stored values
    const storedThrows = parseJson<Partial<Record<AbilityKey, number>>>(m.saving_throws, {});
    const abilityScores = { str: m.str, dex: m.dex, con: m.con, int: m.int, wis: m.wis, cha: m.cha };
    setSaveConfigs(inferSaveConfigs(storedThrows, abilityScores, m.proficiency_bonus));
    // Reset automation and spellcasting state
    setAutoPb(true);
    setAutoXp(true);
    setAutoHp(false);
    // Parse dice count from stored hit_dice string if present
    if (m.hit_dice) {
      const match = m.hit_dice.match(/^(\d+)d/);
      if (match) setHpDiceCount(parseInt(match[1], 10));
    }
    setHpDieSidesOverride(null);
    setSpellcastingAbility('int');
    setSpellSaveDcOverride(undefined);
    setSpellAtkBonusOverride(undefined);
    setEditing(false);
    setError(null);
  }

  function setField(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // When CR changes, auto-update PB and XP if automation is on
  function handleCrChange(cr: string) {
    setField('challenge_rating', cr);
    if (autoPb) setField('proficiency_bonus', proficiencyFromCR(cr));
    if (autoXp) setField('xp_value', xpFromCR(cr));
  }

  // Current ability scores from form (used for calc previews)
  const abilityScores: Record<AbilityKey, number> = {
    str: Number(form.str ?? monster?.str ?? 10),
    dex: Number(form.dex ?? monster?.dex ?? 10),
    con: Number(form.con ?? monster?.con ?? 10),
    int: Number(form.int ?? monster?.int ?? 10),
    wis: Number(form.wis ?? monster?.wis ?? 10),
    cha: Number(form.cha ?? monster?.cha ?? 10),
  };
  const profBonus = Number(form.proficiency_bonus ?? monster?.proficiency_bonus ?? 2);

  // ── HP auto-sync: keep form HP in sync with dice builder ──────────────────
  // This effect runs after every render where the HP automation inputs change.
  // Placed here so abilityScores and all useState hooks are fully initialised.
  useEffect(() => {
    if (!autoHp) return;
    const currentSize = (form.size ?? monster?.size ?? 'medium') as string;
    const dieSides    = hpDieSidesOverride ?? hitDieForSize(currentSize);
    const conScore    = abilityScores.con;
    const avgHp       = calcAverageHp(hpDiceCount, dieSides, conScore);
    const hitDiceStr  = buildHitDiceString(hpDiceCount, dieSides, conScore);
    setForm(prev => ({ ...prev, hit_points: avgHp, hit_dice: hitDiceStr }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoHp, hpDiceCount, hpDieSidesOverride, form.size,
      abilityScores.con, monster?.size]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!monster || !form.name?.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      // Compute final saving throws from proficiency configs
      const computedSaves = computeSavingThrows(abilityScores, saveConfigs, profBonus);
      const now = new Date().toISOString();
      await atlas.db.run(
        `UPDATE monsters SET
           name=?, description=?, creature_type=?, subtype=?, size=?, alignment=?,
           armor_class=?, armor_type=?, hit_points=?, hit_dice=?, speed=?,
           str=?, dex=?, con=?, int=?, wis=?, cha=?,
           proficiency_bonus=?, challenge_rating=?, xp_value=?,
           saving_throws=?, skills=?,
           damage_vulnerabilities=?, damage_resistances=?, damage_immunities=?, condition_immunities=?,
           senses=?, languages=?,
           traits=?, actions=?, reactions=?, legendary_actions=?, legendary_description=?, bonus_actions=?,
           lore=?, is_homebrew=?, tags=?,
           updated_at=?
         WHERE id=? AND campaign_id=?`,
        [
          form.name?.trim()    ?? monster.name,
          form.description     ?? '',
          form.creature_type   ?? monster.creature_type,
          form.subtype         ?? null,
          form.size            ?? monster.size,
          form.alignment       ?? monster.alignment,
          Number(form.armor_class  ?? monster.armor_class),
          form.armor_type      ?? null,
          Number(form.hit_points   ?? monster.hit_points),
          form.hit_dice        ?? null,
          Number(form.speed        ?? monster.speed),
          Number(form.str ?? monster.str), Number(form.dex ?? monster.dex),
          Number(form.con ?? monster.con), Number(form.int ?? monster.int),
          Number(form.wis ?? monster.wis), Number(form.cha ?? monster.cha),
          profBonus,
          form.challenge_rating ?? monster.challenge_rating,
          Number(form.xp_value ?? monster.xp_value),
          JSON.stringify(computedSaves),
          monster.skills,
          monster.damage_vulnerabilities, monster.damage_resistances,
          monster.damage_immunities, monster.condition_immunities,
          form.senses    ?? null,
          form.languages ?? null,
          JSON.stringify(form.traits_arr           ?? []),
          JSON.stringify(form.actions_arr          ?? []),
          JSON.stringify(form.reactions_arr        ?? []),
          JSON.stringify(form.legendaryActions_arr ?? []),
          form.legendary_description ?? null,
          JSON.stringify(form.bonusActions_arr     ?? []),
          form.lore       ?? null,
          form.is_homebrew ?? monster.is_homebrew,
          JSON.stringify(form.tags_arr ?? []),
          now,
          monster.id,
          monster.campaign_id,
        ],
      );
      const rows = await atlas.db.query<MonsterFull>('SELECT * FROM monsters WHERE id = ?', [monster.id]);
      const updated = rows[0];
      if (updated) { setMonster(updated); populateForm(updated); }
      onUpdated(monster.id, form.name?.trim() ?? monster.name, form.challenge_rating ?? monster.challenge_rating);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!monster) return;
    if (!window.confirm(`Delete "${monster.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await atlas.db.run('DELETE FROM monsters WHERE id = ?', [monster.id]);
      onDeleted(monster.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  }

  // ── Empty / loading states ───────────────────────────────────────────────────
  if (!monsterId) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="skull" size={40} className={styles.emptyIcon} />
          <p>Select a monster to view its statblock.</p>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="loader" size={24} />
          <p>Loading…</p>
        </div>
      </div>
    );
  }
  if (!monster) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <p>Monster not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{monster.name}</div>
          <div className={styles.headerMeta}>
            {monster.size} {monster.creature_type}
            {monster.subtype ? ` (${monster.subtype})` : ''}
            {' · '}CR {monster.challenge_rating}
            {monster.is_homebrew ? ' · Homebrew' : ''}
          </div>
        </div>
        <div className={styles.headerActions}>
          {editing ? (
            <>
              <button className={styles.btnCancel} onClick={() => { populateForm(monster); }}>
                <Icon name="x" size={14} /> Cancel
              </button>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
                <Icon name="check" size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button className={styles.btnDelete} onClick={handleDelete} disabled={deleting}>
                <Icon name="trash" size={14} /> Delete
              </button>
              <button className={styles.btnPrint} onClick={() => setPrintOpen(true)}>
                <Icon name="upload" size={14} /> Print
              </button>
              <button className={styles.btnEdit} onClick={() => setEditing(true)}>
                <Icon name="edit" size={14} /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={14} /> {error}
        </div>
      )}

      <div className={`${styles.body} ${saving ? styles.saving : ''}`}>
        {editing ? renderEditForm() : renderStatblock()}
      </div>

      {printOpen && monster && (
        <StatblockPrintModal
          monster={monster}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STATBLOCK VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function renderStatblock() {
    return (
      <>
        <StatblockRenderer monster={monster!} />
        {linkedMinis.length > 0 && (
          <div className={styles.miniSection}>
            <div className={styles.miniSectionTitle}>Available Minis</div>
            <ul className={styles.miniList}>
              {linkedMinis.map(m => (
                <li key={m.id} className={styles.miniItem}>
                  <span className={styles.miniName}>{m.name}</span>
                  {m.base_size && (
                    <span className={styles.miniSize}>{m.base_size}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT FORM
  // ═══════════════════════════════════════════════════════════════════════════

  function renderEditForm() {
    // Computed spell values (live preview)
    const spellScore  = abilityScores[spellcastingAbility];
    const spellDc     = calcSpellSaveDC(spellScore, profBonus, spellSaveDcOverride);
    const spellAtk    = calcSpellAttackBonus(spellScore, profBonus, spellAtkBonusOverride);

    return (
      <div className={styles.editForm}>

        {/* ── Identity ─────────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Identity</div>
          <div className={styles.formRow}>
            <div className={styles.formGroupFull}>
              <label className={styles.label}>Name *</label>
              <input className={styles.input} value={form.name ?? ''} onChange={e => setField('name', e.target.value)} />
            </div>
          </div>
          <div className={styles.formRow} style={{ marginTop: '.75rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Type</label>
              <select className={styles.select} value={form.creature_type ?? ''} onChange={e => setField('creature_type', e.target.value)}>
                {CREATURE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Subtype</label>
              <input className={styles.input} placeholder="e.g. goblinoid" value={form.subtype ?? ''} onChange={e => setField('subtype', e.target.value || null)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Size</label>
              <select className={styles.select} value={form.size ?? ''} onChange={e => setField('size', e.target.value)}>
                {SIZES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Alignment</label>
              <select className={styles.select} value={form.alignment ?? ''} onChange={e => setField('alignment', e.target.value)}>
                {ALIGNMENTS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Core Statistics ──────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Core Statistics</div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Armour Class</label>
              <input className={styles.input} type="number" min={0} max={99} value={form.armor_class ?? 10} onChange={e => setField('armor_class', parseInt(e.target.value, 10))} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Armour Type</label>
              <input className={styles.input} placeholder="e.g. natural armour" value={form.armor_type ?? ''} onChange={e => setField('armor_type', e.target.value || null)} />
            </div>
            {/* Hit Points — manual or auto-calculated from dice */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Hit Points
                <AutoToggle auto={autoHp} onToggle={() => setAutoHp(v => !v)} />
              </label>
              <input
                className={`${styles.input} ${autoHp ? styles.inputAuto : ''}`}
                type="number" min={1}
                value={form.hit_points ?? 1}
                readOnly={autoHp}
                onChange={e => !autoHp && setField('hit_points', parseInt(e.target.value, 10))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Hit Dice</label>
              <input
                className={`${styles.input} ${autoHp ? styles.inputAuto : ''}`}
                placeholder="e.g. 8d8+16"
                value={form.hit_dice ?? ''}
                readOnly={autoHp}
                onChange={e => !autoHp && setField('hit_dice', e.target.value || null)}
              />
            </div>
          </div>

          {/* ── HP Dice Builder (visible when autoHp is ON) ───────────── */}
          {autoHp && (() => {
            const currentSize    = (form.size ?? monster?.size ?? 'medium') as string;
            const dieSides       = hpDieSidesOverride ?? hitDieForSize(currentSize);
            const conScore       = abilityScores.con;
            const avgHp          = calcAverageHp(hpDiceCount, dieSides, conScore);
            const hitDiceStr     = buildHitDiceString(hpDiceCount, dieSides, conScore);
            return (
              <div className={styles.hpBuilder}>
                <span className={styles.hpBuilderLabel}>Dice Builder</span>
                <div className={styles.hpBuilderRow}>
                  {/* Dice count */}
                  <div className={styles.hpBuilderCell}>
                    <span className={styles.calcLabel}>Count</span>
                    <input
                      className={styles.calcInput}
                      type="number" min={1} max={99}
                      value={hpDiceCount}
                      onChange={e => setHpDiceCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>
                  {/* Die sides — auto from size, overridable */}
                  <div className={styles.hpBuilderCell}>
                    <span className={styles.calcLabel}>
                      Die
                      {hpDieSidesOverride === null && <span className={styles.calcAuto}>auto</span>}
                    </span>
                    <select
                      className={styles.calcSelect}
                      value={dieSides}
                      onChange={e => setHpDieSidesOverride(Number(e.target.value))}
                    >
                      {[4,6,8,10,12,20].map(d => (
                        <option key={d} value={d}>
                          d{d}{d === hitDieForSize(currentSize) ? ' (size)' : ''}
                        </option>
                      ))}
                    </select>
                    {hpDieSidesOverride !== null && (
                      <button className={styles.calcResetBtn} onClick={() => setHpDieSidesOverride(null)}>↺</button>
                    )}
                  </div>
                  {/* CON read-only display */}
                  <div className={styles.hpBuilderCell}>
                    <span className={styles.calcLabel}>CON</span>
                    <span className={styles.hpBuilderStatic}>{abilityScores.con} ({formatAbilityMod(abilityScores.con)})</span>
                  </div>
                  {/* Result preview */}
                  <div className={styles.hpBuilderResult}>
                    <span className={styles.hpBuilderEq}>{hitDiceStr}</span>
                    <span className={styles.hpBuilderAvg}>= {avgHp} avg HP</span>
                    <span className={styles.hpBuilderBreak}>
                      {hpDiceCount}×{(dieSides+1)/2} + {hpDiceCount}×{formatAbilityMod(conScore)} (CON)
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className={styles.formRow} style={{ marginTop: '.75rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Speed (ft.)</label>
              <input className={styles.input} type="number" min={0} value={form.speed ?? 30} onChange={e => setField('speed', parseInt(e.target.value, 10))} />
            </div>

            {/* CR — drives auto-PB and auto-XP */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Challenge Rating</label>
              <select className={styles.select} value={form.challenge_rating ?? '1'} onChange={e => handleCrChange(e.target.value)}>
                {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{cr}</option>)}
              </select>
            </div>

            {/* XP — auto-calculated from CR, overridable */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                XP Value
                <AutoToggle auto={autoXp} onToggle={() => setAutoXp(v => !v)} />
              </label>
              <input
                className={`${styles.input} ${autoXp ? styles.inputAuto : ''}`}
                type="number" min={0}
                value={form.xp_value ?? 0}
                readOnly={autoXp}
                onChange={e => !autoXp && setField('xp_value', parseInt(e.target.value, 10))}
              />
            </div>

            {/* Proficiency Bonus — auto-calculated from CR, overridable */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Proficiency Bonus
                <AutoToggle auto={autoPb} onToggle={() => setAutoPb(v => !v)} />
              </label>
              <input
                className={`${styles.input} ${autoPb ? styles.inputAuto : ''}`}
                type="number" min={2} max={9}
                value={profBonus}
                readOnly={autoPb}
                onChange={e => !autoPb && setField('proficiency_bonus', parseInt(e.target.value, 10))}
              />
            </div>
          </div>
        </div>

        {/* ── Ability Scores ───────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Ability Scores</div>
          <div className={styles.abilityInputGrid}>
            {ABILITY_KEYS.map(k => {
              const val = abilityScores[k];
              return (
                <div key={k} className={styles.abilityInputCell}>
                  <span className={styles.abilityInputLabel}>{k.toUpperCase()}</span>
                  <input
                    className={styles.abilityInput}
                    type="number" min={1} max={30}
                    value={val}
                    onChange={e => setField(k, parseInt(e.target.value, 10))}
                  />
                  <span className={styles.abilityMod}>{formatAbilityMod(val)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Saving Throws ────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Saving Throws</div>
          <p className={styles.calcHint}>Check the box to add proficiency. Override the value to enter a manual total.</p>
          <div className={styles.saveGrid}>
            {ABILITY_KEYS.map(k => {
              const cfg = saveConfigs[k] ?? { proficient: false };
              const score = abilityScores[k];
              const modOnly  = abilityModifier(score);
              const withProf = modOnly + profBonus;
              const computed = cfg.proficient ? withProf : modOnly;
              const hasOverride = cfg.override !== undefined;
              const displayed = hasOverride ? cfg.override! : computed;

              return (
                <div key={k} className={styles.saveRow}>
                  {/* Proficiency checkbox */}
                  <label className={styles.saveCheck}>
                    <input
                      type="checkbox"
                      checked={cfg.proficient}
                      onChange={e => {
                        setSaveConfigs(prev => ({
                          ...prev,
                          [k]: { proficient: e.target.checked, override: undefined },
                        }));
                      }}
                    />
                  </label>

                  {/* Ability label */}
                  <span className={styles.saveLabel}>{ABILITY_LABELS[k]}</span>

                  {/* Value — greyed when auto, editable for override */}
                  <div className={styles.calcInputWrap}>
                    <input
                      className={`${styles.saveInput} ${!hasOverride ? styles.calcInputAuto : ''}`}
                      type="number"
                      value={String(displayed)}
                      onChange={e => {
                        const v = e.target.value;
                        setSaveConfigs(prev => ({
                          ...prev,
                          [k]: { ...cfg, override: v === '' ? undefined : Number(v) },
                        }));
                      }}
                    />
                    {hasOverride && (
                      <button
                        className={styles.calcResetBtn}
                        title="Reset to calculated value"
                        onClick={() => setSaveConfigs(prev => ({ ...prev, [k]: { ...cfg, override: undefined } }))}
                      >↺</button>
                    )}
                  </div>

                  {/* Computed hint */}
                  <span className={styles.saveHint}>
                    {formatMod(modOnly)}
                    {cfg.proficient ? ` +${profBonus}pb = ${formatMod(withProf)}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Spellcasting ─────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Spellcasting (optional)</div>
          <p className={styles.calcHint}>Calculated from spellcasting ability + proficiency. Override to set a manual value.</p>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Spellcasting Ability</label>
              <select
                className={styles.select}
                value={spellcastingAbility}
                onChange={e => {
                  setSpellcastingAbility(e.target.value as AbilityKey);
                  setSpellSaveDcOverride(undefined);
                  setSpellAtkBonusOverride(undefined);
                }}
              >
                {SPELLCASTING_ABILITIES.map(k => (
                  <option key={k} value={k}>{ABILITY_FULL_NAMES[k]}</option>
                ))}
              </select>
            </div>

            {/* Spell Save DC */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Spell Save DC
                {spellSaveDcOverride === undefined && <span className={styles.calcAutoInline}>auto {spellDc}</span>}
              </label>
              <div className={styles.calcInputWrap}>
                <input
                  className={`${styles.input} ${spellSaveDcOverride === undefined ? styles.inputAuto : ''}`}
                  type="number"
                  value={spellSaveDcOverride !== undefined ? spellSaveDcOverride : spellDc}
                  readOnly={spellSaveDcOverride === undefined}
                  onChange={e => setSpellSaveDcOverride(Number(e.target.value))}
                  onClick={() => { if (spellSaveDcOverride === undefined) setSpellSaveDcOverride(spellDc); }}
                />
                {spellSaveDcOverride !== undefined && (
                  <button className={styles.calcResetBtn} onClick={() => setSpellSaveDcOverride(undefined)}>↺</button>
                )}
              </div>
            </div>

            {/* Spell Attack Bonus */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Spell Attack Bonus
                {spellAtkBonusOverride === undefined && <span className={styles.calcAutoInline}>auto {formatMod(spellAtk)}</span>}
              </label>
              <div className={styles.calcInputWrap}>
                <input
                  className={`${styles.input} ${spellAtkBonusOverride === undefined ? styles.inputAuto : ''}`}
                  type="number"
                  value={spellAtkBonusOverride !== undefined ? spellAtkBonusOverride : spellAtk}
                  readOnly={spellAtkBonusOverride === undefined}
                  onChange={e => setSpellAtkBonusOverride(Number(e.target.value))}
                  onClick={() => { if (spellAtkBonusOverride === undefined) setSpellAtkBonusOverride(spellAtk); }}
                />
                {spellAtkBonusOverride !== undefined && (
                  <button className={styles.calcResetBtn} onClick={() => setSpellAtkBonusOverride(undefined)}>↺</button>
                )}
              </div>
            </div>
          </div>
          {/* Calculation breakdown */}
          <p className={styles.calcBreakdown}>
            DC: 8 + {profBonus} (prof) + {formatAbilityMod(abilityScores[spellcastingAbility])} ({ABILITY_LABELS[spellcastingAbility]}) = {spellDc}
            &nbsp;·&nbsp;
            Atk: {formatMod(spellAtk)} ({formatMod(abilityModifier(abilityScores[spellcastingAbility]))} + {profBonus} prof)
          </p>
        </div>

        {/* ── Senses & Languages ───────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Senses & Languages</div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Senses</label>
              <input className={styles.input} placeholder="e.g. darkvision 60 ft., passive Perception 12" value={form.senses ?? ''} onChange={e => setField('senses', e.target.value || null)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Languages</label>
              <input className={styles.input} placeholder="e.g. Common, Goblin" value={form.languages ?? ''} onChange={e => setField('languages', e.target.value || null)} />
            </div>
          </div>
        </div>

        {/* ── Traits ───────────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <ActionEditor label="Traits" actions={form.traits_arr ?? []} onChange={v => setField('traits_arr', v)} profBonus={profBonus} abilityScores={abilityScores} />
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <ActionEditor label="Actions" actions={form.actions_arr ?? []} onChange={v => setField('actions_arr', v)} profBonus={profBonus} abilityScores={abilityScores} />
        </div>

        {/* ── Bonus Actions ─────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <ActionEditor label="Bonus Actions" actions={form.bonusActions_arr ?? []} onChange={v => setField('bonusActions_arr', v)} profBonus={profBonus} abilityScores={abilityScores} />
        </div>

        {/* ── Reactions ─────────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <ActionEditor label="Reactions" actions={form.reactions_arr ?? []} onChange={v => setField('reactions_arr', v)} profBonus={profBonus} abilityScores={abilityScores} />
        </div>

        {/* ── Legendary Actions ─────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formGroupFull} style={{ marginBottom: '.75rem' }}>
            <label className={styles.label}>Legendary Action Preamble</label>
            <textarea className={styles.textarea} rows={2}
              placeholder="e.g. The dragon can take 3 legendary actions…"
              value={form.legendary_description ?? ''}
              onChange={e => setField('legendary_description', e.target.value || null)} />
          </div>
          <ActionEditor label="Legendary Actions" actions={form.legendaryActions_arr ?? []} onChange={v => setField('legendaryActions_arr', v)} legendary profBonus={profBonus} abilityScores={abilityScores} />
        </div>

        {/* ── Description & Lore ────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Description & Notes</div>
          <div className={styles.formGroupFull}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} rows={4} value={form.description ?? ''} onChange={e => setField('description', e.target.value)} />
          </div>
          <div className={styles.formGroupFull} style={{ marginTop: '.75rem' }}>
            <label className={styles.label}>GM Notes (private)</label>
            <textarea className={styles.textarea} rows={3} value={form.lore ?? ''} onChange={e => setField('lore', e.target.value || null)} />
          </div>
        </div>

        {/* ── Tags ──────────────────────────────────────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formSectionTitle}>Tags</div>
          <TagEditor tags={form.tags_arr ?? []} onChange={v => setField('tags_arr', v)} />
        </div>

        {/* ── Homebrew ──────────────────────────────────────────────────── */}
        <div className={styles.formSection} style={{ padding: '.75rem 1.3rem' }}>
          <label style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer', fontSize:'.88rem', color:'var(--text-secondary)' }}>
            <input type="checkbox"
              checked={Boolean(form.is_homebrew)}
              onChange={e => setField('is_homebrew', e.target.checked ? 1 : 0)} />
            Homebrew monster
          </label>
        </div>
      </div>
    );
  }
}

// ── AutoToggle pill ───────────────────────────────────────────────────────────

function AutoToggle({ auto, onToggle }: { auto: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.preventDefault(); onToggle(); }}
      style={{
        marginLeft: '.4rem',
        fontSize: '.62rem',
        padding: '.1rem .35rem',
        borderRadius: 20,
        border: `1px solid ${auto ? 'var(--gold-600)' : 'var(--border)'}`,
        background: auto ? 'rgba(196,144,64,.15)' : 'transparent',
        color: auto ? 'var(--gold-400)' : 'var(--ink-500)',
        cursor: 'pointer',
        verticalAlign: 'middle',
        letterSpacing: '.04em',
        transition: 'all .12s',
      }}
    >
      {auto ? 'AUTO' : 'MANUAL'}
    </button>
  );
}
