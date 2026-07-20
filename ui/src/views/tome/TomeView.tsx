import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import styles from './TomeView.module.css';

type TomeDocumentType = 'reference' | 'preparation' | 'handout' | 'template' | 'journal';

interface TomeLinkedEntity {
  module: string;
  entityId: string;
  role: string;
  label?: string;
}

interface RawFolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface RawDocumentRow {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  document_type: TomeDocumentType;
  tags: string;
  author_notes: string;
  is_pinned: number;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RawLinkRow {
  document_id: string;
  entity_module: string;
  entity_id: string;
  role: string;
  label: string | null;
}

interface TomeFolder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface TomeDocument {
  id: string;
  folderId: string | null;
  title: string;
  content: string;
  documentType: TomeDocumentType;
  tags: string[];
  authorNotes: string;
  isPinned: boolean;
  lastOpenedAt: string | null;
  createdAt: string;
  modifiedAt: string;
  linkedEntities: TomeLinkedEntity[];
}

interface TomeDraft {
  title: string;
  content: string;
  documentType: TomeDocumentType;
  tagsText: string;
  authorNotes: string;
  folderId: string | null;
  isPinned: boolean;
  linkedEntities: TomeLinkedEntity[];
}

interface FolderTreeNode extends TomeFolder {
  children: FolderTreeNode[];
}

const DOCUMENT_TYPES: Array<{ value: TomeDocumentType; label: string; hint: string }> = [
  { value: 'reference', label: 'Reference', hint: 'Permanent lore, rules, and price lists.' },
  { value: 'preparation', label: 'Preparation', hint: 'Session prep, encounters, and NPC plans.' },
  { value: 'handout', label: 'Handout', hint: 'Player-facing letters, rumors, and notices.' },
  { value: 'template', label: 'Template', hint: 'Reusable document skeletons.' },
  { value: 'journal', label: 'Journal', hint: 'Campaign history and session summaries.' },
];

const QUICK_LINK_MODULES = [
  'atlas',
  'npcs',
  'factions',
  'quests',
  'sessions',
  'timeline',
  'bestiary',
  'encounters',
  'party',
  'magic-items',
  'mini-catalogue',
] as const;

const DEFAULT_FOLDER_TREE: Array<{ key: string; name: string; parentKey?: string }> = [
  { key: 'tome', name: 'Tome' },
  { key: 'world-lore', name: 'World Lore', parentKey: 'tome' },
  { key: 'alaruel', name: 'Alaruel', parentKey: 'world-lore' },
  { key: 'regions', name: 'Regions', parentKey: 'alaruel' },
  { key: 'factions', name: 'Factions', parentKey: 'alaruel' },
  { key: 'history', name: 'History', parentKey: 'alaruel' },
  { key: 'references', name: 'References', parentKey: 'tome' },
  { key: 'trade-goods', name: 'Trade Goods', parentKey: 'references' },
  { key: 'rules', name: 'Rules', parentKey: 'references' },
  { key: 'preparation', name: 'Preparation', parentKey: 'tome' },
  { key: 'handouts', name: 'Handouts', parentKey: 'tome' },
  { key: 'templates', name: 'Templates', parentKey: 'tome' },
  { key: 'journal', name: 'Journal', parentKey: 'tome' },
];

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function sanitizeHtml(input: string): string {
  if (typeof window === 'undefined' || !input.trim()) return input;
  const allowed = new Set([
    'DIV', 'SPAN', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'H1', 'H2', 'H3', 'H4',
    'BLOCKQUOTE', 'PRE', 'CODE', 'HR', 'A',
  ]);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return input;

  const walk = (node: Element): void => {
    const children = [...node.children];
    for (const child of children) {
      if (!allowed.has(child.tagName)) {
        const parent = child.parentElement;
        if (parent) {
          while (child.firstChild) parent.insertBefore(child.firstChild, child);
          parent.removeChild(child);
        }
        continue;
      }

      for (const attr of [...child.attributes]) {
        if (child.tagName === 'A' && attr.name === 'href') continue;
        child.removeAttribute(attr.name);
      }

      walk(child);
    }
  };

  walk(root);
  return root.innerHTML;
}

function tagsToText(tags: string[]): string {
  return tags.join(', ');
}

function textToTags(raw: string): string[] {
  return raw.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  const diff = Date.now() - value.getTime();
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return value.toLocaleDateString();
}

function buildFolderTree(folders: TomeFolder[]): FolderTreeNode[] {
  const byId = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  for (const folder of folders) {
    byId.set(folder.id, { ...folder, children: [] });
  }

  for (const folder of byId.values()) {
    if (folder.parentId && byId.has(folder.parentId)) {
      byId.get(folder.parentId)?.children.push(folder);
    } else {
      roots.push(folder);
    }
  }

  const sortBranch = (branch: FolderTreeNode[]): void => {
    branch.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    for (const node of branch) sortBranch(node.children);
  };

  sortBranch(roots);
  return roots;
}

function collectFolderIds(folderId: string | null, tree: FolderTreeNode[]): Set<string> {
  const ids = new Set<string>();
  if (folderId === null) return ids;

  const byId = new Map<string, FolderTreeNode>();
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    byId.set(node.id, node);
    stack.push(...node.children);
  }

  const start = byId.get(folderId);
  if (!start) return ids;

  const queue: Array<FolderTreeNode> = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    ids.add(node.id);
    queue.push(...node.children);
  }

  return ids;
}

function buildFolderPath(folderId: string | null, byId: Map<string, TomeFolder>): string {
  if (!folderId) return 'Root';
  const parts: string[] = [];
  let current: TomeFolder | undefined = byId.get(folderId);
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.join(' / ') || 'Root';
}

function decodeHtmlSignature(draft: TomeDraft): string {
  return JSON.stringify({
    title: draft.title,
    content: draft.content,
    documentType: draft.documentType,
    tagsText: draft.tagsText,
    authorNotes: draft.authorNotes,
    folderId: draft.folderId,
    isPinned: draft.isPinned,
    linkedEntities: draft.linkedEntities,
  });
}

function makeDraft(document: TomeDocument): TomeDraft {
  return {
    title: document.title,
    content: document.content,
    documentType: document.documentType,
    tagsText: tagsToText(document.tags),
    authorNotes: document.authorNotes,
    folderId: document.folderId,
    isPinned: document.isPinned,
    linkedEntities: document.linkedEntities,
  };
}

export default function TomeView() {
  const campaign = useCampaignStore((state) => state.campaign);

  const [folders, setFolders] = useState<TomeFolder[]>([]);
  const [documents, setDocuments] = useState<TomeDocument[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TomeDraft | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorSyncedDocumentIdRef = useRef<string | null>(null);
  const draftSourceDocumentIdRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastSavedSignatureRef = useRef<string>('');
  const selectedDocumentIdRef = useRef<string | null>(null);
  const rootFolderIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedDocumentIdRef.current = selectedDocumentId;
  }, [selectedDocumentId]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder] as const)), [folders]);
  const selectedFolderDescendants = useMemo(
    () => collectFolderIds(selectedFolderId, folderTree),
    [folderTree, selectedFolderId],
  );

  const currentDocuments = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return documents.filter((document) => {
      const folderMatch = selectedFolderId === null
        ? true
        : document.folderId !== null && selectedFolderDescendants.has(document.folderId);
      if (!folderMatch) return false;

      if (!searchLower) return true;

      const haystack = [
        document.title,
        document.content.replace(/<[^>]+>/g, ' '),
        document.authorNotes,
        document.tags.join(' '),
        buildFolderPath(document.folderId, folderById),
      ].join(' ').toLowerCase();

      return haystack.includes(searchLower);
    });
  }, [documents, folderById, search, selectedFolderDescendants, selectedFolderId]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  const pinnedDocuments = useMemo(
    () => documents.filter((document) => document.isPinned).slice(0, 6),
    [documents],
  );

  const recentDocuments = useMemo(
    () => [...documents]
      .filter((document) => Boolean(document.lastOpenedAt))
      .sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))
      .slice(0, 6),
    [documents],
  );

  const loadData = useCallback(async () => {
    if (!campaign) {
      setFolders([]);
      setDocuments([]);
      setDraft(null);
      setSelectedDocumentId(null);
      setSelectedFolderId(null);
      rootFolderIdRef.current = null;
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const folderCount = await atlas.db.query<{ c: number }>(
        'SELECT COUNT(*) AS c FROM tome_folders WHERE campaign_id = ?',
        [campaign.id],
      );

      if ((folderCount[0]?.c ?? 0) === 0) {
        const now = new Date().toISOString();
        const ids = new Map<string, string>();
        for (const def of DEFAULT_FOLDER_TREE) ids.set(def.key, crypto.randomUUID());
        for (const def of DEFAULT_FOLDER_TREE) {
          await atlas.db.run(
            `INSERT INTO tome_folders (id, campaign_id, name, parent_id, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              ids.get(def.key),
              campaign.id,
              def.name,
              def.parentKey ? ids.get(def.parentKey) ?? null : null,
              DEFAULT_FOLDER_TREE.findIndex((entry) => entry.key === def.key),
              now,
              now,
            ],
          );
        }
      }

      const [folderRows, documentRows, linkRows] = await Promise.all([
        atlas.db.query<RawFolderRow>(
          'SELECT * FROM tome_folders WHERE campaign_id = ? ORDER BY sort_order ASC, name ASC',
          [campaign.id],
        ),
        atlas.db.query<RawDocumentRow>(
          `SELECT *
           FROM tome_documents
           WHERE campaign_id = ?
           ORDER BY is_pinned DESC, updated_at DESC, title ASC`,
          [campaign.id],
        ),
        atlas.db.query<RawLinkRow>(
          `SELECT l.document_id, l.entity_module, l.entity_id, l.role, l.label
           FROM tome_document_links l
           JOIN tome_documents d ON d.id = l.document_id
           WHERE d.campaign_id = ?
           ORDER BY l.document_id ASC, l.entity_module ASC, l.entity_id ASC, l.role ASC`,
          [campaign.id],
        ),
      ]);

      const linksByDocument = new Map<string, TomeLinkedEntity[]>();
      for (const link of linkRows) {
        const list = linksByDocument.get(link.document_id) ?? [];
        list.push({
          module: link.entity_module as TomeLinkedEntity['module'],
          entityId: link.entity_id,
          role: link.role,
          label: link.label ?? undefined,
        });
        linksByDocument.set(link.document_id, list);
      }

      const nextFolders = folderRows.map((row) => ({
        id: row.id,
        name: row.name,
        parentId: row.parent_id,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      const nextDocuments = documentRows.map((row) => ({
        id: row.id,
        folderId: row.folder_id,
        title: row.title,
        content: sanitizeHtml(row.content),
        documentType: row.document_type,
        tags: safeParseArray(row.tags),
        authorNotes: row.author_notes,
        isPinned: row.is_pinned === 1,
        lastOpenedAt: row.last_opened_at,
        createdAt: row.created_at,
        modifiedAt: row.updated_at,
        linkedEntities: linksByDocument.get(row.id) ?? [],
      }));

      setFolders(nextFolders);
      setDocuments(nextDocuments);
      rootFolderIdRef.current = nextFolders.find((folder) => folder.parentId === null && folder.name === 'Tome')?.id
        ?? nextFolders.find((folder) => folder.parentId === null)?.id
        ?? null;

      const currentId = selectedDocumentIdRef.current;
      const stillExists = currentId ? nextDocuments.some((document) => document.id === currentId) : false;
      const nextSelectedId = stillExists ? currentId : nextDocuments[0]?.id ?? null;
      setSelectedDocumentId(nextSelectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setDraft(null);
      setMode('edit');
      editorSyncedDocumentIdRef.current = null;
      draftSourceDocumentIdRef.current = null;
      lastSavedSignatureRef.current = '';
      return;
    }
    if (draftSourceDocumentIdRef.current === selectedDocumentId) return;
    if (!selectedDocument) {
      setDraft(null);
      editorSyncedDocumentIdRef.current = null;
      lastSavedSignatureRef.current = '';
      return;
    }
    const nextDraft = makeDraft(selectedDocument);
    setDraft(nextDraft);
    lastSavedSignatureRef.current = decodeHtmlSignature(nextDraft);
    draftSourceDocumentIdRef.current = selectedDocumentId;
    setMode('edit');
  }, [selectedDocument, selectedDocumentId]);

  useEffect(() => {
    if (!editorRef.current || !draft || selectedDocumentId === null) return;
    if (editorSyncedDocumentIdRef.current === selectedDocumentId) return;
    editorRef.current.innerHTML = draft.content || '<p></p>';
    editorSyncedDocumentIdRef.current = selectedDocumentId;
  }, [draft?.content, selectedDocumentId]);

  useEffect(() => {
    if (!campaign || !draft || !selectedDocument) return;
    if (decodeHtmlSignature(draft) === lastSavedSignatureRef.current) return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      void ensureSaved();
    }, 650);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [campaign, draft, selectedDocument]);

  async function ensureSaved(): Promise<void> {
    if (!selectedDocument || !draft) return;
    const signatureBefore = decodeHtmlSignature(draft);
    const savedDraft = {
      ...draft,
      title: draft.title.trim() || 'Untitled Tome Entry',
      content: sanitizeHtml(draft.content),
      tagsText: draft.tagsText,
      authorNotes: draft.authorNotes,
    };

    if (signatureBefore === decodeHtmlSignature(savedDraft)) return;

    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      await atlas.db.run(
        `UPDATE tome_documents
         SET title = ?, content = ?, document_type = ?, tags = ?, author_notes = ?, folder_id = ?, is_pinned = ?, updated_at = ?
         WHERE id = ? AND campaign_id = ?`,
        [
          savedDraft.title,
          savedDraft.content,
          savedDraft.documentType,
          JSON.stringify(textToTags(savedDraft.tagsText)),
          savedDraft.authorNotes,
          savedDraft.folderId,
          savedDraft.isPinned ? 1 : 0,
          now,
          selectedDocument.id,
          campaign!.id,
        ],
      );
      await atlas.db.run('DELETE FROM tome_document_links WHERE document_id = ?', [selectedDocument.id]);
      for (const link of savedDraft.linkedEntities) {
        await atlas.db.run(
          `INSERT INTO tome_document_links (document_id, entity_module, entity_id, role, label)
           VALUES (?, ?, ?, ?, ?)`,
          [selectedDocument.id, link.module, link.entityId, link.role, link.label ?? null],
        );
      }
      setDocuments((current) => current.map((document) => (
        document.id === selectedDocument.id
          ? {
              ...document,
              title: savedDraft.title,
              content: savedDraft.content,
              documentType: savedDraft.documentType,
              tags: textToTags(savedDraft.tagsText),
              authorNotes: savedDraft.authorNotes,
              folderId: savedDraft.folderId,
              isPinned: savedDraft.isPinned,
              modifiedAt: now,
              linkedEntities: savedDraft.linkedEntities,
            }
          : document
      )));
      lastSavedSignatureRef.current = decodeHtmlSignature(savedDraft);
      setDraft(savedDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function createDocument(): Promise<void> {
    if (!campaign) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const folderId = selectedFolderId ?? rootFolderIdRef.current;
      await atlas.db.run(
        `INSERT INTO tome_documents
          (id, campaign_id, folder_id, title, content, document_type, tags, author_notes, is_pinned, last_opened_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
        [id, campaign.id, folderId, 'Untitled Tome Entry', '<p></p>', 'preparation', '[]', '', now, now],
      );
      selectedDocumentIdRef.current = id;
      await loadData();
      setSelectedDocumentId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function duplicateDocument(source: TomeDocument): Promise<void> {
    if (!campaign) return;
    setSaving(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await atlas.db.run(
        `INSERT INTO tome_documents
          (id, campaign_id, folder_id, title, content, document_type, tags, author_notes, is_pinned, last_opened_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          id,
          campaign.id,
          source.folderId,
          `Copy of ${source.title}`,
          source.content,
          source.documentType,
          JSON.stringify(source.tags),
          source.authorNotes,
          source.isPinned ? 1 : 0,
          now,
          now,
        ],
      );
      for (const link of source.linkedEntities) {
        await atlas.db.run(
          `INSERT INTO tome_document_links (document_id, entity_module, entity_id, role, label)
           VALUES (?, ?, ?, ?, ?)`,
          [id, link.module, link.entityId, link.role, link.label ?? null],
        );
      }
      selectedDocumentIdRef.current = id;
      await loadData();
      setSelectedDocumentId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(document: TomeDocument): Promise<void> {
    if (!campaign) return;
    setSaving(true);
    setError(null);
    try {
      await atlas.db.run(
        'UPDATE tome_documents SET is_pinned = ?, updated_at = ? WHERE id = ? AND campaign_id = ?',
        [document.isPinned ? 0 : 1, new Date().toISOString(), document.id, campaign.id],
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSelectDocument(id: string): Promise<void> {
    if (id === selectedDocumentId) return;
    await ensureSaved();
    setSelectedDocumentId(id);
  }

  async function handleDeleteDocument(): Promise<void> {
    if (!selectedDocument || !campaign) return;
    if (!window.confirm(`Delete "${selectedDocument.title}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await atlas.db.run('DELETE FROM tome_documents WHERE id = ? AND campaign_id = ?', [selectedDocument.id, campaign.id]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleContentInput(): void {
    if (!editorRef.current) return;
    const nextHtml = sanitizeHtml(editorRef.current.innerHTML);
    setDraft((current) => current ? { ...current, content: nextHtml } : current);
  }

  function applyFormatting(command: string, value?: string): void {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleContentInput();
  }

  function addLinkRow(): void {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        linkedEntities: [
          ...current.linkedEntities,
          { module: 'npcs', entityId: '', role: 'linked', label: '' },
        ],
      };
    });
  }

  function updateLink(index: number, patch: Partial<TomeLinkedEntity>): void {
    setDraft((current) => {
      if (!current) return current;
      const next = [...current.linkedEntities];
      const existing = next[index];
      if (!existing) return current;
      next[index] = { ...existing, ...patch };
      return { ...current, linkedEntities: next };
    });
  }

  function removeLink(index: number): void {
    setDraft((current) => current ? {
      ...current,
      linkedEntities: current.linkedEntities.filter((_, candidateIndex) => candidateIndex !== index),
    } : current);
  }

  async function handleFolderSelect(folderId: string | null): Promise<void> {
    setSelectedFolderId(folderId);
    if (selectedDocument && draft) {
      await ensureSaved();
    }
  }

  const previewHtml = useMemo(() => sanitizeHtml(draft?.content ?? ''), [draft?.content]);
  const displayDocument = useCallback((document: TomeDocument): TomeDocument => {
    if (!draft || !selectedDocument || document.id !== selectedDocument.id) return document;
    return {
      ...document,
      title: draft.title,
      tags: textToTags(draft.tagsText),
      authorNotes: draft.authorNotes,
      folderId: draft.folderId,
      isPinned: draft.isPinned,
      linkedEntities: draft.linkedEntities,
      content: draft.content,
      documentType: draft.documentType,
    };
  }, [draft, selectedDocument]);

  const totalCount = documents.length;
  const filteredCount = currentDocuments.length;

  if (!campaign) {
    return (
      <div className={styles.root}>
        <div className={styles.emptyState}>
          <Icon name="scroll" size={22} />
          <div>
            <h2>The Tome</h2>
            <p>Open a campaign to browse and edit reference documents.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div>
            <h2 className={styles.title}>The Tome</h2>
            <p className={styles.subtitle}>Campaign references, preparation notes, templates, and handouts.</p>
          </div>
          <span className={styles.count}>{totalCount}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.actionButton} onClick={() => void createDocument()} disabled={saving}>
            <Icon name="plus" size={14} />
            New Document
          </button>
          {selectedDocument && (
            <button className={styles.actionButton} onClick={() => void duplicateDocument(selectedDocument)} disabled={saving}>
              <Icon name="copy" size={14} />
              Duplicate
            </button>
          )}
          {selectedDocument && (
            <button className={styles.actionButton} onClick={() => void togglePin(selectedDocument)} disabled={saving}>
              <Icon name="pin" size={14} />
              {selectedDocument.isPinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          <button className={styles.actionButton} onClick={() => void ensureSaved()} disabled={saving || !draft}>
            <Icon name="check" size={14} />
            Save
          </button>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.searchPanel}>
            <label className={styles.label}>
              Search
              <div className={styles.searchWrap}>
                <input
                  className={styles.search}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find documents, tags, or text..."
                />
              </div>
            </label>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Folders</h3>
              <button className={styles.linkButton} onClick={() => void handleFolderSelect(null)}>
                All
              </button>
            </div>
            <FolderTree
              nodes={folderTree}
              selectedFolderId={selectedFolderId}
              onSelect={handleFolderSelect}
              documents={documents}
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Pinned</h3>
            </div>
            {pinnedDocuments.length === 0 ? (
              <p className={styles.emptyHint}>No pinned documents yet.</p>
            ) : (
              <div className={styles.quickList}>
                {pinnedDocuments.map((document) => (
                  <button key={document.id} className={styles.quickItem} onClick={() => void handleSelectDocument(document.id)}>
                    <Icon name="pin" size={12} />
                    <span>{displayDocument(document).title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Recent</h3>
            </div>
            {recentDocuments.length === 0 ? (
              <p className={styles.emptyHint}>Recently opened documents will appear here.</p>
            ) : (
              <div className={styles.quickList}>
                {recentDocuments.map((document) => (
                  <button key={document.id} className={styles.quickItem} onClick={() => void handleSelectDocument(document.id)}>
                    <Icon name="clock" size={12} />
                    <span>{displayDocument(document).title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>

        <main className={styles.listPane}>
          <div className={styles.listHeader}>
            <div>
              <h3>Documents</h3>
              <p>{filteredCount} of {totalCount}</p>
            </div>
            <div className={styles.filterPills}>
              {selectedFolderId === null ? (
                <span className={styles.pill}>All folders</span>
              ) : (
                <span className={styles.pill}>{buildFolderPath(selectedFolderId, folderById)}</span>
              )}
              {search.trim() && <span className={styles.pill}>Search: {search.trim()}</span>}
            </div>
          </div>

          {loading ? (
            <div className={styles.centerMessage}><Icon name="loader" size={16} /> Loading Tome...</div>
          ) : currentDocuments.length === 0 ? (
            <div className={styles.centerMessage}>
              <Icon name="scroll" size={16} />
              <div>
                <strong>No matching documents.</strong>
                <p>Try a different folder filter or create a new note.</p>
              </div>
            </div>
          ) : (
            <div className={styles.documentList}>
              {currentDocuments.map((document) => {
                const visibleDocument = displayDocument(document);
                return (
                  <button
                    key={document.id}
                    className={`${styles.documentRow} ${document.id === selectedDocumentId ? styles.documentRowActive : ''}`}
                    onClick={() => void handleSelectDocument(document.id)}
                  >
                    <div className={styles.documentRowMain}>
                      <div className={styles.documentTitleLine}>
                        {visibleDocument.isPinned && <Icon name="pin" size={12} className={styles.pinIcon} />}
                        <strong>{visibleDocument.title}</strong>
                      </div>
                      <div className={styles.documentMeta}>
                        <span>{DOCUMENT_TYPES.find((type) => type.value === visibleDocument.documentType)?.label ?? visibleDocument.documentType}</span>
                        <span>{buildFolderPath(visibleDocument.folderId, folderById)}</span>
                      </div>
                    </div>
                    <div className={styles.documentRowSide}>
                      <span>{visibleDocument.tags.slice(0, 3).join(', ') || 'Untagged'}</span>
                      <small>{formatRelativeTime(visibleDocument.lastOpenedAt)}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        <section className={styles.detailPane}>
          {!draft || !selectedDocument ? (
            <div className={styles.centerMessage}>
              <Icon name="scroll" size={16} />
              <div>
                <strong>Select a document.</strong>
                <p>Use the Tome to keep rules notes, trade lists, lore, and prep material close at hand.</p>
              </div>
            </div>
          ) : (
            <div className={styles.detailShell}>
              <div className={styles.detailHeader}>
                <div>
                  <h3>Editor</h3>
                  <p>{buildFolderPath(selectedDocument.folderId, folderById)} · Modified {formatRelativeTime(selectedDocument.modifiedAt)}</p>
                </div>
                <div className={styles.modeToggle}>
                  <button className={mode === 'edit' ? styles.modeActive : styles.modeButton} onClick={() => setMode('edit')}>
                    <Icon name="edit" size={12} />
                    Edit
                  </button>
                  <button className={mode === 'preview' ? styles.modeActive : styles.modeButton} onClick={() => setMode('preview')}>
                    <Icon name="eye" size={12} />
                    Preview
                  </button>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <label className={styles.label}>
                  Title
                  <input
                    className={styles.input}
                    value={draft.title}
                    onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value } : current)}
                    onBlur={() => { void ensureSaved(); }}
                  />
                </label>
                <label className={styles.label}>
                  Document Type
                  <select
                    className={styles.input}
                    value={draft.documentType}
                    onChange={(event) => setDraft((current) => current ? { ...current, documentType: event.target.value as TomeDocumentType } : current)}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.label}>
                  Folder
                  <select
                    className={styles.input}
                    value={draft.folderId ?? ''}
                    onChange={(event) => setDraft((current) => current ? { ...current, folderId: event.target.value || null } : current)}
                  >
                    <option value="">Root</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {buildFolderPath(folder.id, folderById)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.label}>
                  Tags
                  <input
                    className={styles.input}
                    value={draft.tagsText}
                    onChange={(event) => setDraft((current) => current ? { ...current, tagsText: event.target.value } : current)}
                    placeholder="Altes, NPC, Combat"
                  />
                </label>
              </div>

              <label className={styles.label}>
                Author Notes
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={draft.authorNotes}
                  onChange={(event) => setDraft((current) => current ? { ...current, authorNotes: event.target.value } : current)}
                  placeholder="Private reminders, revision notes, and prep context."
                />
              </label>

              <section className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <h4>Linked Entities</h4>
                  <button className={styles.linkButton} onClick={addLinkRow}>
                    <Icon name="link" size={12} />
                    Add Link
                  </button>
                </div>
                {draft.linkedEntities.length === 0 ? (
                  <p className={styles.emptyHint}>No linked entities yet.</p>
                ) : (
                  <div className={styles.linkList}>
                    {draft.linkedEntities.map((link, index) => (
                      <div key={`${link.module}-${link.entityId}-${index}`} className={styles.linkRow}>
                        <select
                          className={styles.smallInput}
                          value={link.module}
                          onChange={(event) => updateLink(index, { module: event.target.value })}
                        >
                          {QUICK_LINK_MODULES.map((module) => (
                            <option key={module} value={module}>{module}</option>
                          ))}
                        </select>
                        <input
                          className={styles.smallInput}
                          value={link.entityId}
                          onChange={(event) => updateLink(index, { entityId: event.target.value })}
                          placeholder="Entity ID"
                        />
                        <input
                          className={styles.smallInput}
                          value={link.role}
                          onChange={(event) => updateLink(index, { role: event.target.value })}
                          placeholder="Role"
                        />
                        <input
                          className={styles.smallInput}
                          value={link.label ?? ''}
                          onChange={(event) => updateLink(index, { label: event.target.value })}
                          placeholder="Label"
                        />
                        <button className={styles.iconButton} onClick={() => removeLink(index)}>
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <h4>Content</h4>
                  <div className={styles.toolbarButtons}>
                    <button className={styles.formatButton} onMouseDown={(event) => { event.preventDefault(); applyFormatting('formatBlock', 'H1'); }}>H1</button>
                    <button className={styles.formatButton} onMouseDown={(event) => { event.preventDefault(); applyFormatting('formatBlock', 'H2'); }}>H2</button>
                    <button className={styles.formatButton} onMouseDown={(event) => { event.preventDefault(); applyFormatting('formatBlock', 'H3'); }}>H3</button>
                    <button className={styles.formatButton} onMouseDown={(event) => { event.preventDefault(); applyFormatting('bold'); }}><strong>B</strong></button>
                    <button className={styles.formatButton} onMouseDown={(event) => { event.preventDefault(); applyFormatting('italic'); }}><em>I</em></button>
                    <button className={styles.formatButton} onMouseDown={(event) => { event.preventDefault(); applyFormatting('insertUnorderedList'); }}>Bullets</button>
                    <button className={styles.formatButton} onMouseDown={(event) => { event.preventDefault(); applyFormatting('insertOrderedList'); }}>Numbers</button>
                    <button
                      className={styles.formatButton}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyFormatting('insertHTML', '<table><tbody><tr><th>Header</th><th>Header</th></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table>');
                      }}
                    >
                      Table
                    </button>
                  </div>
                </div>

                {mode === 'edit' ? (
                  <div
                    ref={editorRef}
                    className={styles.editor}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleContentInput}
                    onBlur={() => { void ensureSaved(); }}
                  />
                ) : (
                  <div className={styles.preview} dangerouslySetInnerHTML={{ __html: previewHtml || '<p><em>Nothing yet.</em></p>' }} />
                )}
              </section>

              <div className={styles.detailFooter}>
                <div>
                  <strong>{saving ? 'Saving...' : 'Ready'}</strong>
                  <p>{selectedDocument.isPinned ? 'Pinned to the top of lists.' : 'Document is not pinned.'}</p>
                </div>
                <div className={styles.footerActions}>
                  <button className={styles.actionButton} onClick={() => void ensureSaved()} disabled={saving}>
                    <Icon name="check" size={14} />
                    Save
                  </button>
                  <button className={styles.actionButton} onClick={() => void duplicateDocument(selectedDocument)} disabled={saving}>
                    <Icon name="plus" size={14} />
                    Duplicate
                  </button>
                  <button className={styles.dangerButton} onClick={() => void handleDeleteDocument()} disabled={saving}>
                    <Icon name="trash" size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function FolderTree({
  nodes,
  selectedFolderId,
  onSelect,
  documents,
}: {
  nodes: FolderTreeNode[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void | Promise<void>;
  documents: TomeDocument[];
}): JSX.Element {
  const counts = new Map<string, number>();
  for (const document of documents) {
    if (!document.folderId) continue;
    counts.set(document.folderId, (counts.get(document.folderId) ?? 0) + 1);
  }

  const renderNode = (node: FolderTreeNode, depth: number): JSX.Element => (
    <div key={node.id} className={styles.folderNodeWrap}>
      <button
        className={`${styles.folderNode} ${selectedFolderId === node.id ? styles.folderNodeActive : ''}`}
        style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
        onClick={() => void onSelect(node.id)}
      >
        <Icon name="folder" size={12} />
        <span>{node.name}</span>
        <small>{counts.get(node.id) ?? 0}</small>
      </button>
      {node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className={styles.folderTree}>
      {nodes.map((node) => renderNode(node, 0))}
      {selectedFolderId && (
        <button className={styles.folderNode} onClick={() => void onSelect(null)}>
          <Icon name="home" size={12} />
          <span>All Documents</span>
        </button>
      )}
    </div>
  );
}
