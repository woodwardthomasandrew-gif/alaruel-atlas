import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type { Faction, OrgNode, FactionRelation, FactionRelationType } from '../../types/faction';
import styles from './FactionsView.module.css';

type RawRow = Record<string, unknown>;
type NpcOption = { id: string; name: string };
type LocationOption = { id: string; name: string };

const RELATION_TYPES: FactionRelationType[] = ['allied', 'hostile', 'neutral', 'vassal', 'trade'];

function safeParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseMapLines(input: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const line of input.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [key, rawValue] = line.split(/[:=]/, 2);
    if (!key || !rawValue) continue;
    const value = Number(rawValue.trim());
    if (Number.isFinite(value)) result[key.trim()] = value;
  }
  return result;
}

function parseRelations(input: string): FactionRelation[] {
  const relations: FactionRelation[] = [];
  for (const line of input.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [targetFactionId, rawType, rawStrength, ...rest] = line.split('|').map((p) => p.trim());
    if (!targetFactionId || !rawType) continue;
    if (!RELATION_TYPES.includes(rawType as FactionRelationType)) continue;
    const strength = rawStrength ? Number(rawStrength) : undefined;
    const notes = rest.join('|').trim() || undefined;
    const relation: FactionRelation = {
      targetFactionId,
      type: rawType as FactionRelationType,
    };
    if (strength !== undefined && Number.isFinite(strength)) relation.strength = strength;
    if (notes) relation.notes = notes;
    relations.push(relation);
  }
  return relations;
}

function serializeMap(map: Record<string, number>): string {
  return Object.entries(map).map(([k, v]) => `${k}:${v}`).join('\n');
}

function serializeRelations(relations: FactionRelation[]): string {
  return relations
    .map((r) => `${r.targetFactionId}|${r.type}|${r.strength ?? ''}|${r.notes ?? ''}`.replace(/\|$/, ''))
    .join('\n');
}

function buildTree(nodes: OrgNode[]): Array<OrgNode & { children: OrgNode[] }> {
  const byId = new Map<string, OrgNode & { children: OrgNode[] }>();
  const roots: Array<OrgNode & { children: OrgNode[] }> = [];
  for (const node of nodes) byId.set(node.id, { ...node, children: [] });
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)?.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function isDescendant(nodes: OrgNode[], ancestorId: string, probeId: string): boolean {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node.id);
    childrenByParent.set(node.parentId, list);
  }

  const queue = [...(childrenByParent.get(ancestorId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current === probeId) return true;
    queue.push(...(childrenByParent.get(current) ?? []));
  }
  return false;
}

function renderTree(
  nodes: Array<OrgNode & { children: OrgNode[] }>,
  opts: {
    collapsedIds: Set<string>;
    draggingId: string | null;
    dragOverId: string | null;
    onToggleCollapse: (id: string) => void;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDragOver: (id: string, e: React.DragEvent) => void;
    onDropOnNode: (targetId: string, e: React.DragEvent) => void;
  },
): JSX.Element {
  return (
    <ul className={styles.orgTree}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className={`${styles.orgNode} ${opts.dragOverId === node.id ? styles.orgNodeDropTarget : ''}`}
            draggable
            onDragStart={() => opts.onDragStart(node.id)}
            onDragEnd={() => opts.onDragEnd()}
            onDragOver={(e) => opts.onDragOver(node.id, e)}
            onDrop={(e) => opts.onDropOnNode(node.id, e)}
          >
            {node.children.length > 0 ? (
              <button
                type="button"
                className={styles.orgToggle}
                onClick={() => opts.onToggleCollapse(node.id)}
                title={opts.collapsedIds.has(node.id) ? 'Expand' : 'Collapse'}
              >
                {opts.collapsedIds.has(node.id) ? '▸' : '▾'}
              </button>
            ) : (
              <span className={styles.orgToggleSpacer} />
            )}
            <strong>{node.name}</strong>
            <span>{node.role}</span>
            {node.npcId && <code>{node.npcId}</code>}
            {opts.draggingId === node.id && <span className={styles.orgDragBadge}>Dragging</span>}
          </div>
          {!opts.collapsedIds.has(node.id) && node.children.length > 0
            ? renderTree(node.children as Array<OrgNode & { children: OrgNode[] }>, opts)
            : null}
        </li>
      ))}
    </ul>
  );
}

export default function FactionsView() {
  const campaign = useCampaignStore((s) => s.campaign);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [npcOptions, setNpcOptions] = useState<NpcOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [collapsedOrgIds, setCollapsedOrgIds] = useState<Set<string>>(new Set());
  const [draggingOrgId, setDraggingOrgId] = useState<string | null>(null);
  const [dragOverOrgId, setDragOverOrgId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    strength: '0',
    notes: '',
    tags: '',
    leaderNpcId: '',
    memberNpcIds: [] as string[],
    controlledLocationIds: [] as string[],
    influence: {} as Record<string, number>,
    relations: '',
    reputation: '',
    resources: '',
    organization: [] as OrgNode[],
  });

  const loadFactions = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await atlas.db.query<RawRow>(
        'SELECT * FROM factions WHERE campaign_id = ? ORDER BY name ASC',
        [campaign.id],
      );

      const hydrated = await Promise.all(rows.map(async (row) => {
        const id = row['id'] as string;
        const orgRows = await atlas.db.query<RawRow>(
          `SELECT id, name, role, npc_id, parent_id, notes
           FROM faction_org_nodes
           WHERE faction_id = ?
           ORDER BY sort_order ASC`,
          [id],
        );
        const memberRows = await atlas.db.query<RawRow>(
          'SELECT npc_id FROM faction_members WHERE faction_id = ? ORDER BY npc_id ASC',
          [id],
        );
        const territoryRows = await atlas.db.query<RawRow>(
          `SELECT location_id, influence
           FROM faction_territory
           WHERE faction_id = ?
           ORDER BY influence DESC, location_id ASC`,
          [id],
        );
        const relationRows = await atlas.db.query<RawRow>(
          `SELECT target_faction_id, relation_type, strength, notes
           FROM faction_relations
           WHERE faction_id = ?
           ORDER BY target_faction_id ASC`,
          [id],
        );
        const reputationRows = await atlas.db.query<RawRow>(
          `SELECT group_key, score
           FROM faction_reputation
           WHERE faction_id = ?
           ORDER BY group_key ASC`,
          [id],
        );
        const resourceRows = await atlas.db.query<RawRow>(
          `SELECT resource_key, amount
           FROM faction_resources
           WHERE faction_id = ?
           ORDER BY resource_key ASC`,
          [id],
        );

        const organization: OrgNode[] = orgRows.map((o) => {
          const node: OrgNode = {
            id: o['id'] as string,
            name: o['name'] as string,
            role: o['role'] as string,
          };
          const npcId = o['npc_id'] as string | null;
          const parentId = o['parent_id'] as string | null;
          const notes = o['notes'] as string | null;
          if (npcId) node.npcId = npcId;
          if (parentId) node.parentId = parentId;
          if (notes) node.notes = notes;
          return node;
        });

        const relations: FactionRelation[] = relationRows
          .map((r) => {
            const relation: FactionRelation = {
              targetFactionId: r['target_faction_id'] as string,
              type: r['relation_type'] as FactionRelationType,
            };
            const strength = r['strength'] as number | null;
            const notes = r['notes'] as string | null;
            if (strength !== null) relation.strength = strength;
            if (notes) relation.notes = notes;
            return relation;
          })
          .filter((r) => RELATION_TYPES.includes(r.type));

        const influence = territoryRows.reduce<Record<string, number>>((acc, t) => {
          const key = t['location_id'] as string;
          const value = Number(t['influence']);
          acc[key] = Number.isFinite(value) ? value : 0;
          return acc;
        }, {});

        const reputation = reputationRows.reduce<Record<string, number>>((acc, r) => {
          acc[r['group_key'] as string] = Number(r['score']);
          return acc;
        }, {});

        const resources = resourceRows.reduce<Record<string, number>>((acc, r) => {
          acc[r['resource_key'] as string] = Number(r['amount']);
          return acc;
        }, {});

        return {
          id,
          name: row['name'] as string,
          description: (row['description'] as string) ?? '',
          strength: Number(row['strength'] ?? 0),
          notes: (row['notes'] as string) ?? '',
          organization,
          leaderNpcId: (row['leader_npc_id'] as string | null) ?? null,
          memberNpcIds: memberRows.map((m) => m['npc_id'] as string),
          controlledLocationIds: territoryRows.map((t) => t['location_id'] as string),
          influence,
          relations,
          reputation,
          resources,
          tags: safeParse<string[]>(row['tags'], []),
          createdAt: row['created_at'] as string,
          updatedAt: row['updated_at'] as string,
        } satisfies Faction;
      }));

      setFactions(hydrated);
      if (!selectedId && hydrated.length > 0) setSelectedId(hydrated[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaign, selectedId]);

  const loadReferenceData = useCallback(async () => {
    if (!campaign) return;
    const [npcs, locations] = await Promise.all([
      atlas.db.query<RawRow>(
        'SELECT id, name FROM npcs WHERE campaign_id = ? ORDER BY name ASC',
        [campaign.id],
      ),
      atlas.db.query<RawRow>(
        'SELECT id, name FROM locations WHERE campaign_id = ? ORDER BY name ASC',
        [campaign.id],
      ),
    ]);
    setNpcOptions(
      npcs.map((n) => ({ id: n['id'] as string, name: n['name'] as string })),
    );
    setLocationOptions(
      locations.map((l) => ({ id: l['id'] as string, name: l['name'] as string })),
    );
  }, [campaign]);

  useEffect(() => {
    void loadFactions();
    void loadReferenceData();
  }, [loadFactions, loadReferenceData]);

  useEffect(() => {
    const unsub = atlas.on.moduleEvent(({ event }) => {
      if (event.startsWith('faction:')) void loadFactions();
    });
    return unsub;
  }, [loadFactions]);

  const selected = useMemo(
    () => factions.find((f) => f.id === selectedId) ?? null,
    [factions, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setCollapsedOrgIds(new Set());
    setDraggingOrgId(null);
    setDragOverOrgId(null);
    setForm({
      name: selected.name,
      description: selected.description,
      strength: String(selected.strength),
      notes: selected.notes,
      tags: selected.tags.join(', '),
      leaderNpcId: selected.leaderNpcId ?? '',
      memberNpcIds: selected.memberNpcIds,
      controlledLocationIds: selected.controlledLocationIds,
      influence: selected.influence,
      relations: serializeRelations(selected.relations),
      reputation: serializeMap(selected.reputation),
      resources: serializeMap(selected.resources),
      organization: selected.organization,
    });
  }, [selected?.id]);

  const filtered = useMemo(
    () => factions.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [factions, search],
  );

  async function createFaction() {
    if (!campaign) return;
    setCreating(true);
    setError(null);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await atlas.db.run(
        `INSERT INTO factions
          (id, campaign_id, name, description, strength, notes, leader_npc_id, tags, created_at, updated_at)
         VALUES (?, ?, ?, '', 0, '', NULL, '[]', ?, ?)`,
        [id, campaign.id, 'New Faction', now, now],
      );
      await loadFactions();
      setSelectedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function saveFaction() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const strength = Number(form.strength);
      const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const memberNpcIds = form.memberNpcIds;
      const locationIds = form.controlledLocationIds;
      const influence = form.influence;
      const relations = parseRelations(form.relations);
      const reputation = parseMapLines(form.reputation);
      const resources = parseMapLines(form.resources);
      const organization = form.organization;

      await atlas.db.run(
        `UPDATE factions
         SET name = ?, description = ?, strength = ?, notes = ?, leader_npc_id = ?, tags = ?, updated_at = ?
         WHERE id = ?`,
        [
          form.name.trim(),
          form.description,
          Number.isFinite(strength) ? strength : 0,
          form.notes,
          form.leaderNpcId.trim() || null,
          JSON.stringify(tags),
          now,
          selected.id,
        ],
      );

      await atlas.db.run('DELETE FROM faction_members WHERE faction_id = ?', [selected.id]);
      for (const npcId of memberNpcIds) {
        await atlas.db.run(
          'INSERT OR IGNORE INTO faction_members (faction_id, npc_id) VALUES (?, ?)',
          [selected.id, npcId],
        );
      }

      await atlas.db.run('DELETE FROM faction_org_nodes WHERE faction_id = ?', [selected.id]);
      for (let i = 0; i < organization.length; i += 1) {
        const node = organization[i];
        if (!node) continue;
        await atlas.db.run(
          `INSERT INTO faction_org_nodes
            (id, faction_id, campaign_id, name, role, npc_id, parent_id, notes, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            node.id,
            selected.id,
            campaign!.id,
            node.name,
            node.role,
            node.npcId ?? null,
            node.parentId ?? null,
            node.notes ?? null,
            i,
          ],
        );
      }

      await atlas.db.run('DELETE FROM faction_territory WHERE faction_id = ?', [selected.id]);
      const territoryIds = new Set<string>([...locationIds, ...Object.keys(influence)]);
      for (const locationId of territoryIds) {
        await atlas.db.run(
          'INSERT INTO faction_territory (faction_id, location_id, influence) VALUES (?, ?, ?)',
          [selected.id, locationId, Math.max(0, Math.min(100, influence[locationId] ?? 0))],
        );
      }

      await atlas.db.run('DELETE FROM faction_relations WHERE faction_id = ?', [selected.id]);
      for (const relation of relations) {
        await atlas.db.run(
          `INSERT INTO faction_relations
            (faction_id, target_faction_id, relation_type, strength, notes)
           VALUES (?, ?, ?, ?, ?)`,
          [
            selected.id,
            relation.targetFactionId,
            relation.type,
            relation.strength ?? null,
            relation.notes ?? null,
          ],
        );
      }

      await atlas.db.run('DELETE FROM faction_reputation WHERE faction_id = ?', [selected.id]);
      for (const [groupKey, score] of Object.entries(reputation)) {
        await atlas.db.run(
          'INSERT INTO faction_reputation (faction_id, group_key, score) VALUES (?, ?, ?)',
          [selected.id, groupKey, score],
        );
      }

      await atlas.db.run('DELETE FROM faction_resources WHERE faction_id = ?', [selected.id]);
      for (const [resourceKey, amount] of Object.entries(resources)) {
        await atlas.db.run(
          'INSERT INTO faction_resources (faction_id, resource_key, amount) VALUES (?, ?, ?)',
          [selected.id, resourceKey, amount],
        );
      }

      await loadFactions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteFaction() {
    if (!selected) return;
    if (!window.confirm(`Delete faction "${selected.name}"?`)) return;
    setError(null);
    try {
      await atlas.db.run('DELETE FROM factions WHERE id = ?', [selected.id]);
      await loadFactions();
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const tree = useMemo(() => buildTree(form.organization), [form.organization]);

  const visibleInfluenceRows = useMemo(
    () => form.controlledLocationIds.map((locationId) => {
      const location = locationOptions.find((l) => l.id === locationId);
      return {
        id: locationId,
        name: location?.name ?? locationId,
        influence: form.influence[locationId] ?? 0,
      };
    }),
    [form.controlledLocationIds, form.influence, locationOptions],
  );

  function toggleOrgCollapse(nodeId: string): void {
    setCollapsedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function collapseAllOrg(): void {
    setCollapsedOrgIds(new Set(form.organization.map((n) => n.id)));
  }

  function expandAllOrg(): void {
    setCollapsedOrgIds(new Set());
  }

  function handleOrgDropOnNode(targetId: string, e: React.DragEvent): void {
    e.preventDefault();
    const sourceId = draggingOrgId;
    setDragOverOrgId(null);
    setDraggingOrgId(null);
    if (!sourceId) return;
    if (sourceId === targetId) return;
    if (isDescendant(form.organization, sourceId, targetId)) return;

    setForm((prev) => ({
      ...prev,
      organization: prev.organization.map((node) => {
        if (node.id !== sourceId) return node;
        return { ...node, parentId: targetId };
      }),
    }));
  }

  function handleOrgDropOnRoot(e: React.DragEvent): void {
    e.preventDefault();
    const sourceId = draggingOrgId;
    setDragOverOrgId(null);
    setDraggingOrgId(null);
    if (!sourceId) return;

    setForm((prev) => ({
      ...prev,
      organization: prev.organization.map((node) => {
        if (node.id !== sourceId) return node;
        const updated = { ...node };
        delete updated.parentId;
        return updated;
      }),
    }));
  }

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.left}>
          <h2>Factions</h2>
          <span className={styles.count}>{factions.length}</span>
        </div>
        <div className={styles.right}>
          <input
            className={styles.search}
            placeholder="Search factions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={styles.action} onClick={createFaction} disabled={creating}>
            <Icon name="plus" size={14} />
            New Faction
          </button>
        </div>
      </header>

      {error && <div className={styles.error}><Icon name="alert" size={14} /> {error}</div>}

      <div className={styles.layout}>
        <aside className={styles.listPane}>
          {loading ? (
            <div className={styles.empty}><Icon name="loader" size={16} /> Loading...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>No factions found.</div>
          ) : (
            <ul className={styles.list}>
              {filtered.map((faction) => (
                <li key={faction.id}>
                  <button
                    className={`${styles.listItem} ${selectedId === faction.id ? styles.active : ''}`}
                    onClick={() => setSelectedId(faction.id)}
                  >
                    <span>{faction.name}</span>
                    <small>STR {faction.strength}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={styles.detailPane}>
          {!selected ? (
            <div className={styles.empty}>Select a faction to view details.</div>
          ) : (
            <div className={styles.detail}>
              <div className={styles.headerRow}>
                <h3>{selected.name}</h3>
                <div className={styles.buttons}>
                  <button className={styles.action} onClick={saveFaction} disabled={saving}>
                    <Icon name="check" size={14} />
                    Save
                  </button>
                  <button className={styles.danger} onClick={deleteFaction}>
                    <Icon name="trash" size={14} />
                    Delete
                  </button>
                </div>
              </div>

              <div className={styles.grid}>
                <label>Name<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
                <label>Strength<input value={form.strength} onChange={(e) => setForm((p) => ({ ...p, strength: e.target.value }))} /></label>
                <label>Tags<input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="comma, separated" /></label>
                <label>
                  Leader NPC
                  <select value={form.leaderNpcId} onChange={(e) => setForm((p) => ({ ...p, leaderNpcId: e.target.value }))}>
                    <option value="">None</option>
                    {npcOptions.map((npc) => (
                      <option key={npc.id} value={npc.id}>{npc.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>Description<textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} /></label>

              <h4>Notes</h4>
              <label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={4} /></label>

              <h4>Organization Chart</h4>
              {tree.length > 0 ? (
                <>
                  <div className={styles.orgControls}>
                    <button type="button" className={styles.action} onClick={expandAllOrg}>Expand All</button>
                    <button type="button" className={styles.action} onClick={collapseAllOrg}>Collapse All</button>
                  </div>
                  <div
                    className={`${styles.orgRootDropZone} ${draggingOrgId ? styles.orgRootDropZoneActive : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleOrgDropOnRoot}
                  >
                    Drop here to make node top-level
                  </div>
                  {renderTree(tree, {
                    collapsedIds: collapsedOrgIds,
                    draggingId: draggingOrgId,
                    dragOverId: dragOverOrgId,
                    onToggleCollapse: toggleOrgCollapse,
                    onDragStart: (id) => setDraggingOrgId(id),
                    onDragEnd: () => {
                      setDraggingOrgId(null);
                      setDragOverOrgId(null);
                    },
                    onDragOver: (id, e) => {
                      e.preventDefault();
                      setDragOverOrgId(id);
                    },
                    onDropOnNode: handleOrgDropOnNode,
                  })}
                </>
              ) : <p className={styles.hint}>No organization nodes yet.</p>}
              <div className={styles.orgEditor}>
                {form.organization.map((node, index) => (
                  <div key={`${node.id}-${index}`} className={styles.orgEditorRow}>
                    <input
                      value={node.id}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = [...prev.organization];
                          const current = next[index];
                          if (!current) return prev;
                          next[index] = { ...current, id: value };
                          return { ...prev, organization: next };
                        });
                      }}
                      placeholder="Node ID"
                    />
                    <input
                      value={node.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = [...prev.organization];
                          const current = next[index];
                          if (!current) return prev;
                          next[index] = { ...current, name: value };
                          return { ...prev, organization: next };
                        });
                      }}
                      placeholder="Name"
                    />
                    <input
                      value={node.role}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = [...prev.organization];
                          const current = next[index];
                          if (!current) return prev;
                          next[index] = { ...current, role: value };
                          return { ...prev, organization: next };
                        });
                      }}
                      placeholder="Role"
                    />
                    <select
                      value={node.parentId ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = [...prev.organization];
                          const current = next[index];
                          if (!current) return prev;
                          const updated: OrgNode = { ...current };
                          if (value) updated.parentId = value;
                          else delete updated.parentId;
                          next[index] = updated;
                          return { ...prev, organization: next };
                        });
                      }}
                    >
                      <option value="">No Parent</option>
                      {form.organization
                        .filter((candidate) => candidate.id && candidate.id !== node.id)
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>{candidate.name || candidate.id}</option>
                        ))}
                    </select>
                    <select
                      value={node.npcId ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = [...prev.organization];
                          const current = next[index];
                          if (!current) return prev;
                          const updated: OrgNode = { ...current };
                          if (value) updated.npcId = value;
                          else delete updated.npcId;
                          next[index] = updated;
                          return { ...prev, organization: next };
                        });
                      }}
                    >
                      <option value="">No NPC</option>
                      {npcOptions.map((npc) => (
                        <option key={npc.id} value={npc.id}>{npc.name}</option>
                      ))}
                    </select>
                    <input
                      value={node.notes ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm((prev) => {
                          const next = [...prev.organization];
                          const current = next[index];
                          if (!current) return prev;
                          const updated: OrgNode = { ...current };
                          if (value.trim()) updated.notes = value;
                          else delete updated.notes;
                          next[index] = updated;
                          return { ...prev, organization: next };
                        });
                      }}
                      placeholder="Notes"
                    />
                    <button
                      type="button"
                      className={styles.danger}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          organization: prev.organization.filter((_, i) => i !== index),
                        }));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      organization: [
                        ...prev.organization,
                        {
                          id: crypto.randomUUID().slice(0, 8),
                          name: '',
                          role: '',
                        },
                      ],
                    }));
                  }}
                >
                  <Icon name="plus" size={14} />
                  Add Org Node
                </button>
              </div>

              <h4>Territory</h4>
              <div className={styles.selectorList}>
                {locationOptions.length === 0 ? (
                  <p className={styles.hint}>No locations found in this campaign.</p>
                ) : (
                  locationOptions.map((location) => {
                    const checked = form.controlledLocationIds.includes(location.id);
                    return (
                      <label key={location.id} className={styles.selectorItem}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => {
                              const nextIds = e.target.checked
                                ? [...prev.controlledLocationIds, location.id]
                                : prev.controlledLocationIds.filter((id) => id !== location.id);
                              const nextInfluence = { ...prev.influence };
                              if (!e.target.checked) delete nextInfluence[location.id];
                              else if (nextInfluence[location.id] === undefined) nextInfluence[location.id] = 0;
                              return { ...prev, controlledLocationIds: nextIds, influence: nextInfluence };
                            });
                          }}
                        />
                        <span>{location.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className={styles.influenceGrid}>
                {visibleInfluenceRows.map((row) => (
                  <label key={row.id}>
                    {row.name}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={row.influence}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          influence: {
                            ...prev.influence,
                            [row.id]: Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0,
                          },
                        }));
                      }}
                    />
                  </label>
                ))}
              </div>

              <h4>Relations</h4>
              <label>
                <textarea
                  value={form.relations}
                  onChange={(e) => setForm((p) => ({ ...p, relations: e.target.value }))}
                  rows={5}
                  placeholder="targetFactionId|type|strength|notes"
                />
              </label>

              <h4>Reputation</h4>
              <label>
                <textarea
                  value={form.reputation}
                  onChange={(e) => setForm((p) => ({ ...p, reputation: e.target.value }))}
                  rows={4}
                  placeholder="groupId:score"
                />
              </label>

              <h4>Resources</h4>
              <label>
                <textarea
                  value={form.resources}
                  onChange={(e) => setForm((p) => ({ ...p, resources: e.target.value }))}
                  rows={4}
                  placeholder="resource:amount"
                />
              </label>

              <h4>Members</h4>
              <div className={styles.selectorList}>
                {npcOptions.length === 0 ? (
                  <p className={styles.hint}>No NPCs found in this campaign.</p>
                ) : (
                  npcOptions.map((npc) => (
                    <label key={npc.id} className={styles.selectorItem}>
                      <input
                        type="checkbox"
                        checked={form.memberNpcIds.includes(npc.id)}
                        onChange={(e) => {
                          setForm((prev) => ({
                            ...prev,
                            memberNpcIds: e.target.checked
                              ? [...prev.memberNpcIds, npc.id]
                              : prev.memberNpcIds.filter((id) => id !== npc.id),
                          }));
                        }}
                      />
                      <span>{npc.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
