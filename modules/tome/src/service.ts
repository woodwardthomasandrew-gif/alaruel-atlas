import { BaseService } from '../../_framework/src/index';
import type { EmitFn } from '../../_framework/src/index';
import type { Logger } from '../../../core/logger/src/types';
import type { TomeRepository } from './repository';
import type {
  CreateTomeDocumentInput,
  CreateTomeFolderInput,
  TomeDocument,
  TomeListQuery,
  UpdateTomeDocumentInput,
  UpdateTomeFolderInput,
} from './types';

export class TomeService extends BaseService<TomeRepository> {
  constructor(repository: TomeRepository, log: Logger, emit: EmitFn) {
    super('tome', repository, log, emit);
  }

  listFolders() {
    this.assertInitialised();
    return this.repository.listFolders();
  }

  listDocuments(query: TomeListQuery = {}): TomeDocument[] {
    this.assertInitialised();
    return this.repository.listDocuments(query);
  }

  listRecent(limit = 8): TomeDocument[] {
    this.assertInitialised();
    return this.repository.listRecent(limit);
  }

  createFolder(input: CreateTomeFolderInput): void {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    const folder = this.repository.createFolder({
      ...input,
      id: this.generateId(),
      name: input.name.trim(),
      createdAt: this.now(),
      updatedAt: this.now(),
    });
    this.emit('tome:folder-created', { folderId: folder.id });
  }

  updateFolder(input: UpdateTomeFolderInput): void {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    const updated = this.repository.updateFolder({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Folder not found: ${input.id}`);
    this.emit('tome:folder-updated', { folderId: updated.id });
  }

  createDocument(input: CreateTomeDocumentInput): TomeDocument {
    this.assertInitialised();
    this.requireString(input.title, 'title');
    const document = this.repository.createDocument({
      ...input,
      id: this.generateId(),
      title: input.title.trim(),
      createdAt: this.now(),
      updatedAt: this.now(),
    });
    this.emit('tome:created', { documentId: document.id });
    return document;
  }

  updateDocument(input: UpdateTomeDocumentInput): TomeDocument {
    this.assertInitialised();
    if (input.title !== undefined) this.requireString(input.title, 'title');
    const updated = this.repository.updateDocument({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Document not found: ${input.id}`);
    this.emit('tome:updated', { documentId: updated.id });
    return updated;
  }

  deleteDocument(id: string): void {
    this.assertInitialised();
    const existed = this.repository.deleteDocument(id);
    if (!existed) throw new Error(`Document not found: ${id}`);
    this.emit('tome:deleted', { documentId: id });
  }

  markOpened(id: string): TomeDocument {
    this.assertInitialised();
    const opened = this.repository.markOpened(id, this.now());
    if (!opened) throw new Error(`Document not found: ${id}`);
    return opened;
  }

  pinDocument(id: string, isPinned: boolean): TomeDocument {
    this.assertInitialised();
    const updated = this.repository.pinDocument(id, isPinned, this.now());
    if (!updated) throw new Error(`Document not found: ${id}`);
    this.emit('tome:updated', { documentId: updated.id });
    return updated;
  }
}
