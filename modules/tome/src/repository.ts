import { BaseRepository } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger } from '../../../core/logger/src/types';
import type {
  CreateTomeDocumentInput,
  CreateTomeFolderInput,
  TomeDocument,
  TomeDocumentLinkRow,
  TomeDocumentRow,
  TomeFolder,
  TomeFolderRow,
  TomeListQuery,
  UpdateTomeDocumentInput,
  UpdateTomeFolderInput,
} from './types';

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function rowToFolder(row: TomeFolderRow): TomeFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToDocument(row: TomeDocumentRow, links: TomeDocumentLinkRow[]): TomeDocument {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    documentType: row.document_type,
    tags: parseTags(row.tags),
    createdAt: row.created_at,
    modifiedAt: row.updated_at,
    authorNotes: row.author_notes,
    linkedEntities: links.map((link) => ({
      module: link.entity_module,
      entityId: link.entity_id,
      role: link.role,
      label: link.label ?? undefined,
    })),
    folderId: row.folder_id,
    isPinned: row.is_pinned === 1,
    lastOpenedAt: row.last_opened_at,
  };
}

export class TomeRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('tome', db, log);
  }

  listFolders(): TomeFolder[] {
    return this.query<TomeFolderRow>(
      'SELECT * FROM tome_folders WHERE campaign_id = ? ORDER BY COALESCE(parent_id, ""), sort_order ASC, name ASC',
      [this.campaignId],
    ).map(rowToFolder);
  }

  listDocuments(query: TomeListQuery = {}): TomeDocument[] {
    const conditions: string[] = ['d.campaign_id = ?'];
    const params: (string | number | null)[] = [this.campaignId];

    if (query.folderId !== undefined) {
      if (query.folderId === null) {
        conditions.push('d.folder_id IS NULL');
      } else {
        conditions.push('d.folder_id = ?');
        params.push(query.folderId);
      }
    }
    if (query.documentType) {
      conditions.push('d.document_type = ?');
      params.push(query.documentType);
    }
    if (query.pinnedOnly) {
      conditions.push('d.is_pinned = 1');
    }
    if (query.search) {
      const like = `%${query.search}%`;
      conditions.push('(d.title LIKE ? OR d.content LIKE ? OR d.author_notes LIKE ? OR d.tags LIKE ?)');
      params.push(like, like, like, like);
    }

    const rows = this.query<TomeDocumentRow>(
      `SELECT d.*
       FROM tome_documents d
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.is_pinned DESC, d.updated_at DESC, d.title ASC
       LIMIT ? OFFSET ?`,
      [...params, query.limit ?? 200, query.offset ?? 0],
    );

    return rows.map((row) => rowToDocument(row, this.listLinks(row.id)));
  }

  findById(id: string): TomeDocument | null {
    const row = this.queryOne<TomeDocumentRow>(
      'SELECT * FROM tome_documents WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return row ? rowToDocument(row, this.listLinks(id)) : null;
  }

  listRecent(limit = 8): TomeDocument[] {
    return this.query<TomeDocumentRow>(
      `SELECT *
       FROM tome_documents
       WHERE campaign_id = ? AND last_opened_at IS NOT NULL
       ORDER BY last_opened_at DESC, updated_at DESC
       LIMIT ?`,
      [this.campaignId, limit],
    ).map((row) => rowToDocument(row, this.listLinks(row.id)));
  }

  countDocuments(): number {
    const row = this.queryOne<{ c: number }>(
      'SELECT COUNT(*) AS c FROM tome_documents WHERE campaign_id = ?',
      [this.campaignId],
    );
    return row?.c ?? 0;
  }

  createFolder(input: CreateTomeFolderInput & { id: string; createdAt: string; updatedAt: string }): TomeFolder {
    this.run(
      `INSERT INTO tome_folders (id, campaign_id, name, parent_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.parentId ?? null,
        input.sortOrder ?? 0,
        input.createdAt,
        input.updatedAt,
      ],
    );
    return this.listFolders().find((folder) => folder.id === input.id)!;
  }

  updateFolder(input: UpdateTomeFolderInput & { updatedAt: string }): TomeFolder | null {
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];
    const push = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      params.push(value);
    };
    if (input.name !== undefined) push('name', input.name);
    if (input.parentId !== undefined) push('parent_id', input.parentId ?? null);
    if (input.sortOrder !== undefined) push('sort_order', input.sortOrder ?? 0);
    params.push(input.id, this.campaignId);
    this.run(
      `UPDATE tome_folders SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`,
      params,
    );
    return this.listFolders().find((folder) => folder.id === input.id) ?? null;
  }

  deleteFolder(id: string): boolean {
    return this.run(
      'DELETE FROM tome_folders WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    ).changes > 0;
  }

  createDocument(
    input: CreateTomeDocumentInput & { id: string; createdAt: string; updatedAt: string },
  ): TomeDocument {
    this.run(
      `INSERT INTO tome_documents
        (id, campaign_id, folder_id, title, content, document_type, tags, author_notes, is_pinned, last_opened_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        this.campaignId,
        input.folderId ?? null,
        input.title,
        input.content ?? '',
        input.documentType ?? 'reference',
        JSON.stringify(input.tags ?? []),
        input.authorNotes ?? '',
        input.isPinned ? 1 : 0,
        null,
        input.createdAt,
        input.updatedAt,
      ],
    );
    this.replaceLinks(input.id, input.linkedEntities ?? []);
    return this.findById(input.id)!;
  }

  updateDocument(input: UpdateTomeDocumentInput & { updatedAt: string }): TomeDocument | null {
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];
    const push = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      params.push(value);
    };
    const pushJson = (column: string, value: unknown) => push(column, JSON.stringify(value));

    if (input.title !== undefined) push('title', input.title);
    if (input.content !== undefined) push('content', input.content ?? '');
    if (input.documentType !== undefined) push('document_type', input.documentType);
    if (input.tags !== undefined) pushJson('tags', input.tags);
    if (input.authorNotes !== undefined) push('author_notes', input.authorNotes ?? '');
    if (input.folderId !== undefined) push('folder_id', input.folderId ?? null);
    if (input.isPinned !== undefined) push('is_pinned', input.isPinned ? 1 : 0);
    if (input.lastOpenedAt !== undefined) push('last_opened_at', input.lastOpenedAt ?? null);

    params.push(input.id, this.campaignId);
    this.run(
      `UPDATE tome_documents SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`,
      params,
    );

    if (input.linkedEntities !== undefined) {
      this.replaceLinks(input.id, input.linkedEntities);
    }
    return this.findById(input.id);
  }

  deleteDocument(id: string): boolean {
    return this.run(
      'DELETE FROM tome_documents WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    ).changes > 0;
  }

  markOpened(id: string, openedAt: string): TomeDocument | null {
    this.run(
      'UPDATE tome_documents SET last_opened_at = ?, updated_at = ? WHERE id = ? AND campaign_id = ?',
      [openedAt, openedAt, id, this.campaignId],
    );
    return this.findById(id);
  }

  pinDocument(id: string, isPinned: boolean, updatedAt: string): TomeDocument | null {
    this.run(
      'UPDATE tome_documents SET is_pinned = ?, updated_at = ? WHERE id = ? AND campaign_id = ?',
      [isPinned ? 1 : 0, updatedAt, id, this.campaignId],
    );
    return this.findById(id);
  }

  private listLinks(documentId: string): TomeDocumentLinkRow[] {
    return this.query<TomeDocumentLinkRow>(
      `SELECT document_id, entity_module, entity_id, role, label
       FROM tome_document_links
       WHERE document_id = ?
       ORDER BY entity_module ASC, entity_id ASC, role ASC`,
      [documentId],
    );
  }

  private replaceLinks(documentId: string, links: Array<{ module: string; entityId: string; role: string; label?: string }>): void {
    this.run('DELETE FROM tome_document_links WHERE document_id = ?', [documentId]);
    for (const link of links) {
      this.run(
        `INSERT INTO tome_document_links (document_id, entity_module, entity_id, role, label)
         VALUES (?, ?, ?, ?, ?)`,
        [documentId, link.module, link.entityId, link.role, link.label ?? null],
      );
    }
  }
}
