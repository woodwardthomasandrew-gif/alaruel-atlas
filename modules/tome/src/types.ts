import type { ModuleId } from '../../_framework/src/index';

export type TomeDocumentType = 'reference' | 'preparation' | 'handout' | 'template' | 'journal';

export interface TomeFolderRow {
  id: string;
  campaign_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TomeDocumentRow {
  id: string;
  campaign_id: string;
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

export interface TomeDocumentLinkRow {
  document_id: string;
  entity_module: ModuleId;
  entity_id: string;
  role: string;
  label: string | null;
}

export interface TomeFolder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TomeLinkedEntity {
  module: ModuleId;
  entityId: string;
  role: string;
  label?: string;
}

export interface TomeDocument {
  id: string;
  title: string;
  content: string;
  documentType: TomeDocumentType;
  tags: string[];
  createdAt: string;
  modifiedAt: string;
  authorNotes: string;
  linkedEntities: TomeLinkedEntity[];
  folderId: string | null;
  isPinned: boolean;
  lastOpenedAt: string | null;
}

export interface CreateTomeFolderInput {
  name: string;
  parentId?: string | null;
  sortOrder?: number;
}

export interface UpdateTomeFolderInput extends Partial<CreateTomeFolderInput> {
  id: string;
}

export interface CreateTomeDocumentInput {
  title: string;
  content?: string;
  documentType?: TomeDocumentType;
  tags?: string[];
  authorNotes?: string;
  folderId?: string | null;
  isPinned?: boolean;
  linkedEntities?: TomeLinkedEntity[];
}

export interface UpdateTomeDocumentInput extends Partial<CreateTomeDocumentInput> {
  id: string;
  lastOpenedAt?: string | null;
}

export interface TomeListQuery {
  search?: string;
  folderId?: string | null;
  documentType?: TomeDocumentType;
  pinnedOnly?: boolean;
  limit?: number;
  offset?: number;
}
