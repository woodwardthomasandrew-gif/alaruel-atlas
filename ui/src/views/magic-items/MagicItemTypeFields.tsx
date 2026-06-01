// ui/src/views/magic-items/MagicItemTypeFields.tsx
// Shared renderer for type-specific magic item form and preview fields.

import { getMagicItemConfig, titleCase, type MagicItemData, type MagicItemFieldDefinition } from './magicItemFields';
import styles from './MagicItemsView.module.css';

function formatFieldValue(field: MagicItemFieldDefinition, value: MagicItemData[string]): string {
  if (field.kind === 'checkbox') {
    return value ? 'Yes' : 'No';
  }

  if (field.kind === 'number') {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return field.key === 'attackBonus' || field.key === 'armorBonus'
      ? `${numeric >= 0 ? '+' : ''}${numeric}`
      : String(numeric);
  }

  return value === null || value === undefined || value === '' ? '—' : String(value);
}

interface Props {
  itemType: string;
  value: MagicItemData;
  onChange?: (next: MagicItemData) => void;
  editing?: boolean;
}

export function MagicItemTypeFields({
  itemType,
  value,
  onChange,
  editing = false,
}: Props) {
  const config = getMagicItemConfig(itemType);
  const summaryFields = config.summaryFields
    .map(key => config.fields.find(field => field.key === key))
    .filter((field): field is MagicItemFieldDefinition => Boolean(field));

  if (summaryFields.length === 0) {
    return null;
  }

  if (!editing) {
    return (
      <div className={styles.cardStats}>
        {summaryFields.map(field => (
          <div key={field.key} className={styles.stat}>
            <span className={styles.statLabel}>{field.label}</span>
            <span className={styles.statValue}>{formatFieldValue(field, value[field.key])}</span>
          </div>
        ))}
      </div>
    );
  }

  const update = (key: string, nextValue: string | number | boolean) => {
    onChange?.({ ...value, [key]: nextValue });
  };

  return (
    <div className={styles.formGrid}>
      {summaryFields.map(field => {
        const raw = value[field.key];

        if (field.kind === 'checkbox') {
          return (
            <label key={field.key} className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={Boolean(raw)}
                onChange={e => update(field.key, e.target.checked)}
              />
              {field.label}
            </label>
          );
        }

        if (field.kind === 'textarea') {
          return (
            <div key={field.key} className={styles.field}>
              <label className={styles.label}>{field.label}</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={typeof raw === 'string' ? raw : raw === null || raw === undefined ? '' : String(raw)}
                placeholder={field.placeholder}
                onChange={e => update(field.key, e.target.value)}
              />
              {field.help && <span className={styles.helper}>{field.help}</span>}
            </div>
          );
        }

        return (
          <div key={field.key} className={styles.field}>
            <label className={styles.label}>{field.label}</label>
            {field.kind === 'select' ? (
              <select
                className={styles.select}
                value={typeof raw === 'string' ? raw : raw === null || raw === undefined ? '' : String(raw)}
                onChange={e => update(field.key, e.target.value)}
              >
                <option value="">Choose one</option>
                {(field.options ?? []).map(option => (
                  <option key={option} value={option}>{titleCase(option)}</option>
                ))}
              </select>
            ) : (
              <input
                className={styles.input}
                type={field.kind === 'number' ? 'number' : 'text'}
                value={typeof raw === 'string' || typeof raw === 'number' ? String(raw) : ''}
                placeholder={field.placeholder}
                onChange={e => update(field.key, field.kind === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
              />
            )}
            {field.help && <span className={styles.helper}>{field.help}</span>}
          </div>
        );
      })}
    </div>
  );
}
