// ui/src/views/magic-items/MagicItemPrintView.tsx
// Print-ready magic item sheet using stable class names for the print stylesheet.

import { Icon } from '../../components/ui/Icon';
import type { MagicItemRow } from './MagicItemsView';
import {
  formatMagicItemDataValue,
  getMagicItemConfig,
  normalizeMagicItemData,
  titleCase,
} from './magicItemFields';

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

function formatValue(value: number | null): string {
  return value === null || value === undefined ? '—' : `${value.toLocaleString()} gp`;
}

function formatWeight(value: number | null): string {
  return value === null || value === undefined ? '—' : `${value} lb.`;
}

function formatDetailValue(key: string, value: string | number | boolean | null | undefined): string {
  if (key === 'attackBonus' || key === 'armorBonus') {
    if (value === null || value === undefined || value === '') return '—';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return `${numeric >= 0 ? '+' : ''}${numeric}`;
  }

  return formatMagicItemDataValue(value);
}

interface Props {
  item: MagicItemRow;
}

export function MagicItemPrintView({ item }: Props) {
  const tags = parseTags(item.tags);
  const itemData = normalizeMagicItemData(item.item_type, item.item_data);
  const config = getMagicItemConfig(item.item_type);
  const summaryFields = config.summaryFields
    .map(key => config.fields.find(field => field.key === key))
    .filter((field): field is NonNullable<typeof field> => Boolean(field));

  return (
    <article className="mi-card">
      <header className="mi-banner">
        <div className="mi-banner-top">
          <div>
            <h1 className="mi-name">{item.name}</h1>
            <p className="mi-line">
              {titleCase(item.item_type)} · {titleCase(item.rarity)}
              {item.requires_attunement === 1 ? ' · Attunement required' : ''}
            </p>
          </div>
          <div className="mi-badges">
            <span className="mi-pill mi-pill-rarity">{titleCase(item.rarity)}</span>
            <span className="mi-pill mi-pill-type">{titleCase(item.item_type)}</span>
          </div>
        </div>
      </header>

      <div className="mi-divider" />

      <section className="mi-section">
        <div className="mi-card-grid">
          <div className="mi-art">
            {item.image_asset_id ? (
              <img className="mi-image" src={`atlas://asset/${item.image_asset_id}`} alt="" />
            ) : (
              <div className="mi-image-fallback">
                <Icon name="sparkles" size={28} />
              </div>
            )}
          </div>

          <div className="mi-meta">
            <div className="mi-meta-grid">
              <div className="mi-stat">
                <span className="mi-stat-label">Source</span>
                <span className="mi-stat-value">{item.source || '—'}</span>
              </div>
              <div className="mi-stat">
                <span className="mi-stat-label">Value</span>
                <span className="mi-stat-value">{formatValue(item.value_gp)}</span>
              </div>
              <div className="mi-stat">
                <span className="mi-stat-label">Weight</span>
                <span className="mi-stat-value">{formatWeight(item.weight_lb)}</span>
              </div>
              <div className="mi-stat">
                <span className="mi-stat-label">Charges</span>
                <span className="mi-stat-value">{item.charges === null || item.charges === undefined ? '—' : item.charges}</span>
              </div>
            </div>

            {summaryFields.length > 0 && (
              <div className="mi-note">
                <h2 className="mi-note-title">{config.title}</h2>
                <div className="mi-meta-grid">
                  {summaryFields.map(field => (
                    <div key={field.key} className="mi-stat">
                      <span className="mi-stat-label">{field.label}</span>
                      <span className="mi-stat-value">{formatDetailValue(field.key, itemData[field.key])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.requires_attunement === 1 && item.attunement_text && (
              <div className="mi-note">
                <h2 className="mi-note-title">Attunement</h2>
                <p className="mi-note-text">{item.attunement_text}</p>
              </div>
            )}

            {item.recharge && (
              <div className="mi-note">
                <h2 className="mi-note-title">Recharge</h2>
                <p className="mi-note-text">{item.recharge}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {item.description && (
        <>
          <div className="mi-divider mi-divider-subtle" />
          <section className="mi-section">
            <h2 className="mi-heading">Description</h2>
            <p className="mi-body">{item.description}</p>
          </section>
        </>
      )}

      {item.lore && (
        <>
          <div className="mi-divider mi-divider-subtle" />
          <section className="mi-section">
            <h2 className="mi-heading">GM Notes</h2>
            <p className="mi-body">{item.lore}</p>
          </section>
        </>
      )}

      {tags.length > 0 && (
        <section className="mi-section mi-tags">
          <div className="mi-tag-row">
            {tags.map(tag => (
              <span key={tag} className="mi-tag">{tag}</span>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
