// ui/src/views/magic-items/MagicItemsView.tsx
// Root magic items view - list panel left, card editor / preview panel right.

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import { MagicItemPrintModal } from './MagicItemPrintModal';
import {
  MAGIC_ITEM_RARITIES,
  MAGIC_ITEM_TYPES,
  normalizeMagicItemData,
  serializeMagicItemData,
  titleCase,
  type MagicItemData,
} from './magicItemFields';
import { MagicItemTypeFields } from './MagicItemTypeFields';
import styles from './MagicItemsView.module.css';

interface MagicItemSummary {
  id: string;
  name: string;
  item_type: string;
  rarity: string;
  requires_attunement: number;
}

export interface MagicItemRow extends MagicItemSummary {
  description: string;
  item_data: string;
  attunement_text: string | null;
  source: string | null;
  value_gp: number | null;
  weight_lb: number | null;
  charges: number | null;
  recharge: string | null;
  lore: string | null;
  image_asset_id: string | null;
  tags: string;
}

interface AssetRow {
  id: string;
  name: string;
  virtual_path: string;
  mime_type: string;
}

type AttunementFilter = 'all' | 'yes' | 'no';

function parseTags(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function rarityLabel(value: string): string {
  return titleCase(value);
}

function formatGold(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString()} gp`;
}

function formatWeight(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value} lb.`;
}

async function ensureMagicItemDataColumn(): Promise<void> {
  const rows = await atlas.db.query<{ name: string }>(
    `SELECT name
       FROM pragma_table_info('magic_items')
      WHERE name = 'item_data'
      LIMIT 1`,
  );

  if (rows.length === 0) {
    await atlas.db.run(`ALTER TABLE magic_items ADD COLUMN item_data TEXT NOT NULL DEFAULT '{}'`);
  }
}

export default function MagicItemsView() {
  const campaign = useCampaignStore(s => s.campaign);

  const [items, setItems] = useState<MagicItemSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [attunementFilter, setAttunementFilter] = useState<AttunementFilter>('all');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaign) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ensureMagicItemDataColumn();
      const rows = await atlas.db.query<MagicItemSummary>(
        `SELECT id, name, item_type, rarity, requires_attunement
         FROM magic_items
         WHERE campaign_id = ?
         ORDER BY rarity ASC, name ASC`,
        [campaign.id],
      );
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return atlas.on.moduleEvent(({ event }) => {
      if (
        event === 'magic-items:created' ||
        event === 'magic-items:updated' ||
        event === 'magic-items:deleted'
      ) {
        load();
      }
    });
  }, [load]);

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search]);
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = !searchLower || item.name.toLowerCase().includes(searchLower);
      const matchType = !typeFilter || item.item_type === typeFilter;
      const matchRarity = !rarityFilter || item.rarity === rarityFilter;
      const matchAttunement =
        attunementFilter === 'all'
          ? true
          : attunementFilter === 'yes'
            ? item.requires_attunement === 1
            : item.requires_attunement === 0;
      return matchSearch && matchType && matchRarity && matchAttunement;
    });
  }, [items, searchLower, typeFilter, rarityFilter, attunementFilter]);

  function handleCreated(id: string) {
    setCreating(false);
    load().then(() => setSelectedId(id));
  }

  function handleUpdated(updated: MagicItemRow) {
    setItems(prev => prev.map(item => (
      item.id === updated.id
        ? {
            id: updated.id,
            name: updated.name,
            item_type: updated.item_type,
            rarity: updated.rarity,
            requires_attunement: updated.requires_attunement,
          }
        : item
    )));
  }

  function handleDeleted(id: string) {
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedId(null);
  }

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Magic Items</h2>
          <span className={styles.count}>{items.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.createBtn} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            New Item
          </button>
        </div>
      </header>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Icon name="sparkles" size={13} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="text"
            placeholder="Search magic items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <span className={styles.filterLabel}>Type:</span>
        <select className={styles.filterSelect} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All</option>
          {MAGIC_ITEM_TYPES.map(type => (
            <option key={type} value={type}>{titleCase(type)}</option>
          ))}
        </select>

        <span className={styles.filterLabel}>Rarity:</span>
        <select className={styles.filterSelect} value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}>
          <option value="">All</option>
          {MAGIC_ITEM_RARITIES.map(rarity => (
            <option key={rarity} value={rarity}>{rarityLabel(rarity)}</option>
          ))}
        </select>

        <span className={styles.filterLabel}>Attunement:</span>
        <select
          className={styles.filterSelect}
          value={attunementFilter}
          onChange={e => setAttunementFilter(e.target.value as AttunementFilter)}
        >
          <option value="all">All</option>
          <option value="yes">Required</option>
          <option value="no">Not required</option>
        </select>
      </div>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} /> {error}
        </div>
      )}

      <div className={styles.body}>
        <MagicItemList
          items={filtered}
          loading={loading}
          selectedId={selectedId}
          onSelect={id => setSelectedId(id)}
        />
        <MagicItemDetail
          itemId={selectedId}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      </div>

      {creating && campaign && (
        <MagicItemCreateModal
          campaignId={campaign.id}
          onCreated={handleCreated}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function MagicItemList({
  items,
  loading,
  selectedId,
  onSelect,
}: {
  items: MagicItemSummary[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="loader" size={22} className={styles.spin} />
          <span>Loading magic items…</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="sparkles" size={32} className={styles.emptyIcon} />
          <p>No magic items yet.</p>
          <p className={styles.emptyHint}>Create one with the button above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id}>
            <button
              className={`${styles.item} ${selectedId === item.id ? styles.active : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <div className={styles.avatar} aria-hidden>
                {item.name.slice(0, 1).toUpperCase()}
              </div>
              <div className={styles.info}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.meta}>
                  {titleCase(item.item_type)} · {rarityLabel(item.rarity)}
                  {item.requires_attunement === 1 && ' · Attunement'}
                </span>
              </div>
              <span className={styles.rarityBadge}>{rarityLabel(item.rarity)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MagicItemDetail({
  itemId,
  onUpdated,
  onDeleted,
}: {
  itemId: string | null;
  onUpdated: (updated: MagicItemRow) => void;
  onDeleted: (id: string) => void;
}) {
  const campaign = useCampaignStore(s => s.campaign);
  const [item, setItem] = useState<MagicItemRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [imageAssets, setImageAssets] = useState<AssetRow[]>([]);
  const [assetBusy, setAssetBusy] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('wondrous item');
  const [formRarity, setFormRarity] = useState('common');
  const [formAttune, setFormAttune] = useState(false);
  const [formAttuneText, setFormAttuneText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSource, setFormSource] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formCharges, setFormCharges] = useState('');
  const [formRecharge, setFormRecharge] = useState('');
  const [formLore, setFormLore] = useState('');
  const [formImageAssetId, setFormImageAssetId] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formItemData, setFormItemData] = useState<MagicItemData>(normalizeMagicItemData('wondrous item', null));

  const loadImageAssets = useCallback(async () => {
    if (!campaign) {
      setImageAssets([]);
      return;
    }

    try {
      const rows = await atlas.db.query<AssetRow>(
        `SELECT id, name, virtual_path, mime_type
         FROM assets
         WHERE campaign_id = ? AND mime_type LIKE 'image/%'
         ORDER BY name ASC`,
        [campaign.id],
      );
      setImageAssets(rows);
    } catch {
      setImageAssets([]);
    }
  }, [campaign]);

  async function importItemImage() {
    setAssetBusy(true);
    setError(null);
    try {
      const filePath = await atlas.assets.pickFile('portraits');
      if (!filePath) return;

      const result = await atlas.assets.import({
        sourcePath: filePath,
        name: filePath.split(/[\\/]/).pop() ?? 'Asset',
        category: 'portraits',
      });
      if (!result.ok || !result.assetId) {
        throw new Error(result.error ?? 'Unable to import image.');
      }

      setFormImageAssetId(result.assetId);
      await loadImageAssets();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAssetBusy(false);
    }
  }

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      setEditing(false);
      setConfirmDelete(false);
      setPrintOpen(false);
      setImageAssets([]);
      return;
    }

    setLoading(true);
    setError(null);
    atlas.db.query<MagicItemRow>('SELECT * FROM magic_items WHERE id = ?', [itemId])
      .then(rows => {
        const row = rows[0] ?? null;
        setItem(row);
        if (row) {
          setFormName(row.name);
          setFormType(row.item_type);
          setFormRarity(row.rarity);
          setFormAttune(row.requires_attunement === 1);
          setFormAttuneText(row.attunement_text ?? '');
          setFormDescription(row.description);
          setFormItemData(normalizeMagicItemData(row.item_type, row.item_data));
          setFormSource(row.source ?? '');
          setFormValue(row.value_gp !== null && row.value_gp !== undefined ? String(row.value_gp) : '');
          setFormWeight(row.weight_lb !== null && row.weight_lb !== undefined ? String(row.weight_lb) : '');
          setFormCharges(row.charges !== null && row.charges !== undefined ? String(row.charges) : '');
          setFormRecharge(row.recharge ?? '');
          setFormLore(row.lore ?? '');
          setFormImageAssetId(row.image_asset_id ?? '');
          setFormTags(parseTags(row.tags).join(', '));
        }
        setEditing(false);
        setConfirmDelete(false);
        setPrintOpen(false);
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    loadImageAssets();
  }, [editing, loadImageAssets]);

  async function handleSave() {
    if (!item || !itemId) return;
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const tags = formTags.split(',').map(tag => tag.trim()).filter(Boolean);
      const valueGp = formValue.trim() === '' ? null : Number(formValue);
      const weightLb = formWeight.trim() === '' ? null : Number(formWeight);
      const charges = formCharges.trim() === '' ? null : Number(formCharges);

      await ensureMagicItemDataColumn();

      await atlas.db.run(
        `UPDATE magic_items
         SET name=?, item_type=?, rarity=?, requires_attunement=?, attunement_text=?,
             description=?, item_data=?, source=?, value_gp=?, weight_lb=?, charges=?, recharge=?,
             lore=?, image_asset_id=?, tags=?,
             updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id=?`,
        [
          trimmedName,
          formType,
          formRarity,
          formAttune ? 1 : 0,
          formAttune ? (formAttuneText.trim() || null) : null,
          formDescription,
          serializeMagicItemData(formItemData),
          formSource.trim() || null,
          Number.isFinite(valueGp as number) ? valueGp : null,
          Number.isFinite(weightLb as number) ? weightLb : null,
          Number.isFinite(charges as number) ? charges : null,
          formRecharge.trim() || null,
          formLore.trim() || null,
          formImageAssetId.trim() || null,
          JSON.stringify(tags),
          itemId,
        ],
      );

      const updated: MagicItemRow = {
        ...item,
        name: trimmedName,
        item_type: formType,
        rarity: formRarity,
        requires_attunement: formAttune ? 1 : 0,
        attunement_text: formAttune ? (formAttuneText.trim() || null) : null,
        description: formDescription,
        item_data: serializeMagicItemData(formItemData),
        source: formSource.trim() || null,
        value_gp: Number.isFinite(valueGp as number) ? (valueGp as number) : null,
        weight_lb: Number.isFinite(weightLb as number) ? (weightLb as number) : null,
        charges: Number.isFinite(charges as number) ? (charges as number) : null,
        recharge: formRecharge.trim() || null,
        lore: formLore.trim() || null,
        image_asset_id: formImageAssetId.trim() || null,
        tags: JSON.stringify(tags),
      };
      setItem(updated);
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!itemId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await atlas.db.run('DELETE FROM magic_items WHERE id = ?', [itemId]);
      onDeleted(itemId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConfirmDelete(false);
    }
  }

  if (!itemId) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="sparkles" size={40} className={styles.emptyIcon} />
          <p>Select a magic item to edit its card.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Icon name="loader" size={24} className={styles.spin} />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <p>Magic item not found.</p>
        </div>
      </div>
    );
  }

  const tags = parseTags(item.tags);
  const preview = editing
    ? {
        name: formName,
        itemType: formType,
        rarity: formRarity,
        requiresAttunement: formAttune,
        attunementText: formAttuneText,
        description: formDescription,
        itemData: formItemData,
        source: formSource,
        valueGp: formValue.trim() === '' ? null : Number(formValue),
        weightLb: formWeight.trim() === '' ? null : Number(formWeight),
        charges: formCharges.trim() === '' ? null : Number(formCharges),
        recharge: formRecharge,
        lore: formLore,
        imageAssetId: formImageAssetId,
        tags: formTags.split(',').map(tag => tag.trim()).filter(Boolean),
      }
    : {
        name: item.name,
        itemType: item.item_type,
        rarity: item.rarity,
        requiresAttunement: item.requires_attunement === 1,
        attunementText: item.attunement_text ?? '',
        description: item.description,
        itemData: normalizeMagicItemData(item.item_type, item.item_data),
        source: item.source ?? '',
        valueGp: item.value_gp,
        weightLb: item.weight_lb,
        charges: item.charges,
        recharge: item.recharge ?? '',
        lore: item.lore ?? '',
        imageAssetId: item.image_asset_id ?? '',
        tags,
      };
  const selectedImageAsset = editing
    ? imageAssets.find(asset => asset.id === formImageAssetId) ?? null
    : null;

  return (
    <div className={styles.panel}>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderLeft}>
          <div className={styles.avatar}>{item.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <div className={styles.detailName}>{item.name}</div>
            <div className={styles.pills}>
              <span className={styles.typePill}>{titleCase(item.item_type)}</span>
              <span className={styles.rarityPill}>{rarityLabel(item.rarity)}</span>
              {item.requires_attunement === 1 && (
                <span className={styles.attunePill}>Attunement</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {!editing ? (
            <>
              <button className={styles.printBtn} onClick={() => setPrintOpen(true)}>
                <Icon name="upload" size={14} /> Print
              </button>
              <button className={styles.editBtn} onClick={() => { setEditing(true); setConfirmDelete(false); }}>
                <Icon name="edit" size={14} /> Edit
              </button>
              <button
                className={`${styles.deleteBtn} ${confirmDelete ? styles.deleteBtnConfirm : ''}`}
                onClick={handleDelete}
              >
                {confirmDelete ? 'Click again to confirm' : <><Icon name="trash" size={14} /> Delete</>}
              </button>
            </>
          ) : (
            <>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className={styles.cancelBtn} onClick={() => { setEditing(false); setConfirmDelete(false); }}>
                Cancel
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

      <div className={styles.detailBody}>
        <div className={styles.cardPreview}>
          <div className={styles.cardArt}>
            {preview.imageAssetId ? (
              <img className={styles.cardImage} src={`atlas://asset/${preview.imageAssetId}`} alt="" />
            ) : (
              <div className={styles.cardImageFallback}>
                <Icon name="sparkles" size={28} />
              </div>
            )}
          </div>

          {editing && (
            <div className={styles.assetPicker}>
              <div className={styles.assetPickerHeader}>
                <div className={styles.field}>
                  <label className={styles.label}>Picture</label>
                  <select
                    className={styles.select}
                    value={formImageAssetId}
                    onChange={e => setFormImageAssetId(e.target.value)}
                  >
                    <option value="">No image</option>
                    {imageAssets.map(asset => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.assetPickerActions}>
                  <button
                    className={styles.assetBtn}
                    onClick={importItemImage}
                    disabled={assetBusy}
                    type="button"
                  >
                    <Icon name="upload" size={14} />
                    {assetBusy ? 'Importing...' : 'Import Image'}
                  </button>
                  <button
                    className={styles.assetBtn}
                    onClick={() => setFormImageAssetId('')}
                    disabled={assetBusy || !formImageAssetId}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {formImageAssetId ? (
                <div className={styles.assetPreviewLine}>
                  Selected image: {selectedImageAsset?.name ?? formImageAssetId}
                </div>
              ) : imageAssets.length === 0 ? (
                <div className={styles.assetPreviewLine}>
                  No imported images found yet. Use Import Image to add one.
                </div>
              ) : null}
            </div>
          )}

          <div className={styles.cardBody}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardName}>{preview.name || 'Untitled Item'}</div>
                <div className={styles.cardMeta}>
                  {titleCase(preview.itemType)} · {rarityLabel(preview.rarity)}
                </div>
              </div>
              <div className={styles.cardPills}>
                <span className={styles.rarityPill}>{rarityLabel(preview.rarity)}</span>
                {preview.requiresAttunement && <span className={styles.attunePill}>Attunement</span>}
              </div>
            </div>

            {preview.description && <p className={styles.cardDescription}>{preview.description}</p>}

            <div className={styles.cardStats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Source</span>
                <span className={styles.statValue}>{preview.source || '—'}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Value</span>
                <span className={styles.statValue}>{formatGold(preview.valueGp as number | null)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Weight</span>
                <span className={styles.statValue}>{formatWeight(preview.weightLb as number | null)}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Charges</span>
                <span className={styles.statValue}>
                  {preview.charges === null || preview.charges === undefined ? '—' : preview.charges}
                </span>
              </div>
            </div>

            <MagicItemTypeFields
              itemType={preview.itemType}
              value={preview.itemData}
            />

            {preview.requiresAttunement && preview.attunementText && (
              <div className={styles.noteBlock}>
                <div className={styles.noteLabel}>Attunement</div>
                <div className={styles.noteText}>{preview.attunementText}</div>
              </div>
            )}

            {preview.recharge && (
              <div className={styles.noteBlock}>
                <div className={styles.noteLabel}>Recharge</div>
                <div className={styles.noteText}>{preview.recharge}</div>
              </div>
            )}

            {preview.lore && (
              <div className={styles.noteBlock}>
                <div className={styles.noteLabel}>GM Notes</div>
                <div className={styles.noteText}>{preview.lore}</div>
              </div>
            )}

            {preview.tags.length > 0 && (
              <div className={styles.tagRow}>
                {preview.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Name</label>
                <input className={styles.input} value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Type</label>
                <select
                  className={styles.select}
                  value={formType}
                  onChange={e => {
                    const nextType = e.target.value;
                    setFormType(nextType);
                    setFormItemData(normalizeMagicItemData(nextType, null));
                  }}
                >
                  {MAGIC_ITEM_TYPES.map(type => <option key={type} value={type}>{titleCase(type)}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Rarity</label>
                <select className={styles.select} value={formRarity} onChange={e => setFormRarity(e.target.value)}>
                  {MAGIC_ITEM_RARITIES.map(rarity => <option key={rarity} value={rarity}>{rarityLabel(rarity)}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Source</label>
                <input className={styles.input} value={formSource} onChange={e => setFormSource(e.target.value)} placeholder="Core rulebook, homebrew, etc." />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Value</label>
                <input className={styles.input} type="number" min={0} value={formValue} onChange={e => setFormValue(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Weight</label>
                <input className={styles.input} type="number" min={0} step="0.1" value={formWeight} onChange={e => setFormWeight(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Charges</label>
                <input className={styles.input} type="number" min={0} value={formCharges} onChange={e => setFormCharges(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Recharge</label>
                <input className={styles.input} value={formRecharge} onChange={e => setFormRecharge(e.target.value)} placeholder="Dawn, 1d4 days, etc." />
              </div>
            </div>

            <MagicItemTypeFields
              itemType={formType}
              value={formItemData}
              onChange={setFormItemData}
              editing
            />

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={formAttune}
                onChange={e => setFormAttune(e.target.checked)}
              />
              Requires attunement
            </label>

            {formAttune && (
              <div className={styles.field}>
                <label className={styles.label}>Attunement Text</label>
                <input
                  className={styles.input}
                  value={formAttuneText}
                  onChange={e => setFormAttuneText(e.target.value)}
                  placeholder="By a spellcaster, by a dwarf, etc."
                />
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea className={styles.textarea} rows={4} value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>GM Notes</label>
              <textarea className={styles.textarea} rows={3} value={formLore} onChange={e => setFormLore(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tags <span className={styles.helper}>(comma-separated)</span></label>
              <input className={styles.input} value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="fire, relic, cursed" />
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <div className={styles.readOnlyBlock}>{item.description || 'No description yet.'}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>GM Notes</label>
              <div className={styles.readOnlyBlock}>{item.lore || 'No notes.'}</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tags</label>
              <div className={styles.tagRow}>
                {tags.length > 0
                  ? tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)
                  : <span className={styles.helper}>No tags yet.</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {printOpen && item && (
        <MagicItemPrintModal
          item={item}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}

function MagicItemCreateModal({
  campaignId,
  onCreated,
  onClose,
}: {
  campaignId: string;
  onCreated: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState('wondrous item');
  const [rarity, setRarity] = useState('common');
  const [requiresAttunement, setRequiresAttunement] = useState(false);
  const [attunementText, setAttunementText] = useState('');
  const [itemData, setItemData] = useState<MagicItemData>(normalizeMagicItemData('wondrous item', null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await ensureMagicItemDataColumn();
      await atlas.db.run(
        `INSERT INTO magic_items (
           id, campaign_id, name, item_type, rarity, requires_attunement, attunement_text,
           description, item_data, source, value_gp, weight_lb, charges, recharge, lore, image_asset_id,
           tags, created_at, updated_at
         ) VALUES (
            ?,?,?,?,?,?,?,
           ?,?,?,?,?,?,?,?,?,
           ?,?,?
         )`,
        [
          id,
          campaignId,
          trimmedName,
          itemType,
          rarity,
          requiresAttunement ? 1 : 0,
          requiresAttunement ? (attunementText.trim() || null) : null,
          '',
          serializeMagicItemData(itemData),
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          '[]',
          now,
          now,
        ],
      );
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>New Magic Item</h2>
        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input
              className={styles.input}
              placeholder="e.g. Cloak of the Starfall Court"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Type</label>
              <select
                className={styles.select}
                value={itemType}
                onChange={e => {
                  const nextType = e.target.value;
                  setItemType(nextType);
                  setItemData(normalizeMagicItemData(nextType, null));
                }}
              >
                {MAGIC_ITEM_TYPES.map(type => <option key={type} value={type}>{titleCase(type)}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Rarity</label>
              <select className={styles.select} value={rarity} onChange={e => setRarity(e.target.value)}>
                {MAGIC_ITEM_RARITIES.map(r => <option key={r} value={r}>{rarityLabel(r)}</option>)}
              </select>
            </div>
          </div>

          <MagicItemTypeFields
            itemType={itemType}
            value={itemData}
            onChange={setItemData}
            editing
          />

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={requiresAttunement}
              onChange={e => setRequiresAttunement(e.target.checked)}
            />
            Requires attunement
          </label>

          {requiresAttunement && (
            <div className={styles.field}>
              <label className={styles.label}>Attunement Text</label>
              <input
                className={styles.input}
                value={attunementText}
                onChange={e => setAttunementText(e.target.value)}
                placeholder="By a wizard, by a good-aligned creature, etc."
              />
            </div>
          )}

          {error && (
            <div className={styles.errorBar}>
              <Icon name="alert" size={15} /> {error}
            </div>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
