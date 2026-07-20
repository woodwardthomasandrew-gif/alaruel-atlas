import type { SchemaRegistration } from '../../../core/database/src/types';

export const TOME_SCHEMA: SchemaRegistration = {
  module: 'tome',
  migrations: [
    {
      version: 35,
      module: 'tome',
      description: 'Create tome folders, documents, and linked entity tables',
      up: `
        CREATE TABLE IF NOT EXISTS tome_folders (
          id          TEXT    PRIMARY KEY,
          campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name        TEXT    NOT NULL,
          parent_id   TEXT    REFERENCES tome_folders(id) ON DELETE SET NULL,
          sort_order  INTEGER NOT NULL DEFAULT 0,
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_tome_folders_campaign ON tome_folders (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_tome_folders_parent   ON tome_folders (campaign_id, parent_id, sort_order);

        CREATE TABLE IF NOT EXISTS tome_documents (
          id             TEXT    PRIMARY KEY,
          campaign_id    TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          folder_id      TEXT    REFERENCES tome_folders(id) ON DELETE SET NULL,
          title          TEXT    NOT NULL,
          content        TEXT    NOT NULL DEFAULT '',
          document_type  TEXT    NOT NULL DEFAULT 'reference'
                                   CHECK (document_type IN ('reference','preparation','handout','template','journal')),
          tags           TEXT    NOT NULL DEFAULT '[]',
          author_notes   TEXT    NOT NULL DEFAULT '',
          is_pinned      INTEGER NOT NULL DEFAULT 0,
          last_opened_at TEXT,
          created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_tome_documents_campaign ON tome_documents (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_tome_documents_folder    ON tome_documents (campaign_id, folder_id, title);
        CREATE INDEX IF NOT EXISTS idx_tome_documents_type      ON tome_documents (campaign_id, document_type);
        CREATE INDEX IF NOT EXISTS idx_tome_documents_pin       ON tome_documents (campaign_id, is_pinned, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tome_documents_opened    ON tome_documents (campaign_id, last_opened_at DESC);

        CREATE TABLE IF NOT EXISTS tome_document_links (
          document_id   TEXT NOT NULL REFERENCES tome_documents(id) ON DELETE CASCADE,
          entity_module TEXT NOT NULL,
          entity_id     TEXT NOT NULL,
          role          TEXT NOT NULL DEFAULT 'linked',
          label         TEXT,
          PRIMARY KEY (document_id, entity_module, entity_id, role)
        );
        CREATE INDEX IF NOT EXISTS idx_tome_document_links_document ON tome_document_links (document_id);
        CREATE INDEX IF NOT EXISTS idx_tome_document_links_entity   ON tome_document_links (entity_module, entity_id);

        CREATE TRIGGER IF NOT EXISTS trg_tome_folders_updated_at
        AFTER UPDATE ON tome_folders FOR EACH ROW
        BEGIN
          UPDATE tome_folders SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_tome_documents_updated_at
        AFTER UPDATE ON tome_documents FOR EACH ROW
        BEGIN
          UPDATE tome_documents SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_tome_documents_updated_at;
        DROP TRIGGER IF EXISTS trg_tome_folders_updated_at;
        DROP TABLE IF EXISTS tome_document_links;
        DROP TABLE IF EXISTS tome_documents;
        DROP TABLE IF EXISTS tome_folders;
      `,
    },
  ],
};
