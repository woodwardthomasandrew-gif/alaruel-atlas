import { useState, useEffect, useCallback } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import styles               from './AssetsView.module.css';

type AssetCategory = 'all'|'maps'|'portraits'|'audio'|'documents'|'misc';

interface Asset {
  id:string; name:string; category:string; mimeType:string;
  sizeBytes:number; virtualPath:string; widthPx:number|null; heightPx:number|null;
  tags:string[]; createdAt:string; updatedAt:string;
}

const CATEGORY_ICON: Record<string,string> = {
  maps:'map', portraits:'users', audio:'clock', documents:'scroll',
  misc:'folder', all:'folder',
} as const;

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}

export default function AssetsView() {
  const campaign = useCampaignStore(s => s.campaign);
  const [assets,    setAssets]    = useState<Asset[]>([]);
  const [counts,    setCounts]    = useState<Record<string,number>>({});
  const [category,  setCategory]  = useState<AssetCategory>('all');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<Asset|null>(null);
  const [loading,   setLoading]   = useState(true);
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState<string|null>(null);

  type RawAsset = Record<string,unknown>;

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      const [rows, countRows] = await Promise.all([
        atlas.db.query<RawAsset>(
          category === 'all'
            ? 'SELECT * FROM assets WHERE campaign_id=? ORDER BY name ASC'
            : 'SELECT * FROM assets WHERE campaign_id=? AND category=? ORDER BY name ASC',
          category === 'all' ? [campaign.id] : [campaign.id, category],
        ),
        atlas.db.query<{category:string;c:number}>(
          'SELECT category, COUNT(*) AS c FROM assets WHERE campaign_id=? GROUP BY category',
          [campaign.id],
        ),
      ]);
      setAssets(rows.map(r => ({
        id:         r['id']           as string,
        name:       r['name']         as string,
        category:   r['category']     as string,
        mimeType:   r['mime_type']    as string,
        sizeBytes:  r['size_bytes']   as number ?? 0,
        virtualPath:r['virtual_path'] as string,
        widthPx:    r['width_px']     as number|null,
        heightPx:   r['height_px']    as number|null,
        tags:       JSON.parse(r['tags'] as string ?? '[]') as string[],
        createdAt:  r['created_at']   as string,
        updatedAt:  r['updated_at']   as string,
      })));
      const c: Record<string,number> = {};
      countRows.forEach(r => { c[r.category] = r.c; });
      setCounts(c);
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setLoading(false); }
  }, [campaign, category]);

  useEffect(() => { load(); }, [load]);

  async function importAsset() {
    setImporting(true);
    setError(null);
    try {
      const filePath = await atlas.assets.pickFile(category === 'all' ? undefined : category);
      if (!filePath) { setImporting(false); return; }
      const name = filePath.split(/[\/]/).pop() ?? 'Asset';
      const result = await atlas.assets.import({
        sourcePath: filePath, name, category: category === 'all' ? 'misc' : category,
      });
      if (!result.ok) throw new Error(result.error);
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setImporting(false); }
  }

  async function deleteAsset(id: string) {
    if (!window.confirm('Delete this asset? It will be removed from all linked entities.')) return;
    await atlas.db.run('DELETE FROM assets WHERE id=?', [id]);
    if (selected?.id === id) setSelected(null);
    await load();
  }

  const filtered = assets.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = Object.values(counts).reduce((a,b) => a+b, 0);

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Assets</h2>
          <span className={styles.count}>{total} total</span>
        </div>
        <div className={styles.toolbarRight}>
          <input className={styles.search} placeholder="Search assets…"
            value={search} onChange={e => setSearch(e.target.value)}/>
          <button className={styles.importBtn} onClick={importAsset} disabled={importing}>
            {importing
              ? <><Icon name="loader" size={15} className={styles.spin}/> Importing…</>
              : <><Icon name="upload" size={15}/> Import</>}
          </button>
        </div>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={15}/> {error}</div>}

      <div className={styles.body}>
        {/* Category sidebar */}
        <div className={styles.catSidebar}>
          {(['all','maps','portraits','audio','documents','misc'] as AssetCategory[]).map(cat => (
            <button key={cat}
              className={`${styles.catBtn} ${category===cat?styles.catActive:''}`}
              onClick={() => setCategory(cat)}>
              <Icon name={(CATEGORY_ICON[cat] ?? 'folder') as Parameters<typeof Icon>[0]['name']} size={15}/>
              <span className={styles.catName}>{cat}</span>
              <span className={styles.catCount}>
                {cat==='all' ? total : (counts[cat] ?? 0)}
              </span>
            </button>
          ))}
        </div>

        {/* Asset grid */}
        <div className={styles.grid}>
          {loading ? (
            <div className={styles.empty}><Icon name="loader" size={24} className={styles.spin}/></div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="folder" size={40} className={styles.emptyIcon}/>
              <p>{search ? 'No assets match your search.' : `No ${category} assets yet.`}</p>
              <button className={styles.importBtnLg} onClick={importAsset}>
                <Icon name="upload" size={16}/> Import Asset
              </button>
            </div>
          ) : (
            filtered.map(asset => (
              <button key={asset.id}
                className={`${styles.assetCard} ${selected?.id===asset.id?styles.assetSelected:''}`}
                onClick={() => setSelected(s => s?.id===asset.id ? null : asset)}>
                <div className={styles.assetThumb}>
                  {asset.mimeType.startsWith('image/') ? (
                    <Icon name="image" size={28} className={styles.thumbIcon}/>
                  ) : asset.mimeType.startsWith('audio/') ? (
                    <Icon name="clock" size={28} className={styles.thumbIcon}/>
                  ) : asset.mimeType === 'application/pdf' ? (
                    <Icon name="scroll" size={28} className={styles.thumbIcon}/>
                  ) : (
                    <Icon name="folder" size={28} className={styles.thumbIcon}/>
                  )}
                </div>
                <div className={styles.assetInfo}>
                  <span className={styles.assetName}>{asset.name}</span>
                  <span className={styles.assetMeta}>
                    {asset.category} · {formatBytes(asset.sizeBytes)}
                    {asset.widthPx && asset.heightPx ? ` · ${asset.widthPx}×${asset.heightPx}` : ''}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>{selected.name}</span>
              <button className={styles.deleteBtn} onClick={() => deleteAsset(selected.id)}
                title="Delete asset">
                <Icon name="trash" size={15}/>
              </button>
            </div>
            <div className={styles.detailBody}>
              <div className={styles.detailRow}><span>Category</span><span>{selected.category}</span></div>
              <div className={styles.detailRow}><span>Type</span><span>{selected.mimeType}</span></div>
              <div className={styles.detailRow}><span>Size</span><span>{formatBytes(selected.sizeBytes)}</span></div>
              {selected.widthPx && selected.heightPx && (
                <div className={styles.detailRow}><span>Dimensions</span><span>{selected.widthPx}×{selected.heightPx}px</span></div>
              )}
              <div className={styles.detailRow}><span>Path</span><span className={styles.pathText}>{selected.virtualPath}</span></div>
              <div className={styles.detailRow}><span>Added</span><span>{new Date(selected.createdAt).toLocaleDateString()}</span></div>
              {selected.tags.length > 0 && (
                <div className={styles.tagsRow}>
                  {selected.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
