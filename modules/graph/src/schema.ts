import type { SchemaRegistration } from '../../../core/database/src/types';
export const GRAPH_SCHEMA: SchemaRegistration = {
  module: 'graph',
  migrations: [
    {
      version: 7, module: 'graph',
      description: 'Create entity_relationships and entity_notes tables',
      up: `
        CREATE TABLE IF NOT EXISTS entity_relationships (
          id                TEXT    PRIMARY KEY,
          campaign_id       TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          source_id         TEXT    NOT NULL,
          source_type       TEXT    NOT NULL CHECK (source_type IN ('npc','faction','location','quest','session','event','plot_thread','asset','map')),
          target_id         TEXT    NOT NULL,
          target_type       TEXT    NOT NULL CHECK (target_type IN ('npc','faction','location','quest','session','event','plot_thread','asset','map')),
          relationship_type TEXT    NOT NULL DEFAULT 'custom'
                                CHECK (relationship_type IN ('disposition','membership','leadership','location_link','quest_link','plot_link','causality','asset_link','session_link','custom')),
          label             TEXT    NOT NULL DEFAULT \'\',
          strength          INTEGER CHECK (strength IS NULL OR (strength >= -100 AND strength <= 100)),
          directed          INTEGER NOT NULL DEFAULT 0,
          note              TEXT,
          created_at        TEXT    NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')),
          updated_at        TEXT    NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')),
          UNIQUE (campaign_id,source_id,source_type,target_id,target_type,relationship_type)
        );
        CREATE INDEX IF NOT EXISTS idx_entity_rel_source ON entity_relationships (campaign_id,source_type,source_id);
        CREATE INDEX IF NOT EXISTS idx_entity_rel_target ON entity_relationships (campaign_id,target_type,target_id);
      `,
      down: `DROP TABLE IF EXISTS entity_relationships;`,
    },
    {
      version: 24,
      module: 'graph',
      description: 'Persist graph node layout state across sessions',
      up: `
        CREATE TABLE IF NOT EXISTS graph_layout_state (
          campaign_id    TEXT    PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
          positions_json TEXT    NOT NULL DEFAULT '{}',
          updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
      `,
      down: `DROP TABLE IF EXISTS graph_layout_state;`,
    },
  ],
};
