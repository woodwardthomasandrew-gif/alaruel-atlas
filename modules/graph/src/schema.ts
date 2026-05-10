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
    {
      version: 25,
      module: 'graph',
      description: 'Persist graph node and edge overlay state for the intelligence board',
      up: `
        CREATE TABLE IF NOT EXISTS graph_node_overlays (
          campaign_id       TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          entity_id         TEXT    NOT NULL,
          entity_type       TEXT    NOT NULL CHECK (entity_type IN ('npc','faction','location','quest','session','event','plot_thread','asset','map')),
          title             TEXT    NOT NULL DEFAULT '',
          subtitle          TEXT    NOT NULL DEFAULT '',
          icon              TEXT    NOT NULL DEFAULT '',
          portrait_asset_id  TEXT    REFERENCES assets(id) ON DELETE SET NULL,
          faction_id        TEXT,
          tags_json         TEXT    NOT NULL DEFAULT '[]',
          notes            TEXT    NOT NULL DEFAULT '',
          hidden_notes      TEXT    NOT NULL DEFAULT '',
          color            TEXT    NOT NULL DEFAULT '',
          importance       INTEGER NOT NULL DEFAULT 2 CHECK (importance >= 0 AND importance <= 4),
          visibility_state TEXT    NOT NULL DEFAULT 'public' CHECK (visibility_state IN ('public','player-known','secret')),
          created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          PRIMARY KEY (campaign_id, entity_id, entity_type)
        );

        CREATE TABLE IF NOT EXISTS graph_relationship_overlays (
          campaign_id       TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          relationship_id   TEXT    NOT NULL,
          style_type        TEXT    NOT NULL DEFAULT 'alliance'
                                 CHECK (style_type IN ('alliance','rivalry','blackmail','espionage','debt','romance','manipulation','loyalty','suspicion','custom')),
          visibility_state  TEXT    NOT NULL DEFAULT 'public'
                                 CHECK (visibility_state IN ('public','player-known','secret')),
          temporal_state    TEXT    NOT NULL DEFAULT 'active'
                                 CHECK (temporal_state IN ('active','deteriorating','former-ally','historical')),
          color_override    TEXT    NOT NULL DEFAULT '',
          notes             TEXT    NOT NULL DEFAULT '',
          created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          PRIMARY KEY (campaign_id, relationship_id)
        );

        CREATE INDEX IF NOT EXISTS idx_graph_node_overlays_campaign
          ON graph_node_overlays (campaign_id, entity_type);

        CREATE INDEX IF NOT EXISTS idx_graph_relationship_overlays_campaign
          ON graph_relationship_overlays (campaign_id, style_type);
      `,
      down: `
        DROP TABLE IF EXISTS graph_relationship_overlays;
        DROP TABLE IF EXISTS graph_node_overlays;
      `,
    },
  ],
};
