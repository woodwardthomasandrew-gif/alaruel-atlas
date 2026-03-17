-- =============================================================================
-- Migration 008 — Entity Relationships & Entity Notes
-- =============================================================================
-- These two tables are the polymorphic heart of the schema.
--
-- entity_relationships: Stores any typed connection between any two entities
--   (NPC ↔ NPC, NPC ↔ Faction, Faction ↔ Faction, Quest ↔ NPC, etc.)
--   without requiring a dedicated junction table for every pair.
--   Specific junction tables (npc_factions, quest_npcs, etc.) are kept for
--   the high-frequency, well-typed associations that benefit from indexes and
--   FKs. This table handles the long tail of ad-hoc relationships.
--
-- entity_notes: A universal notes table for any entity type. Module-specific
--   note tables (npc_notes, quest_notes, session_notes) handle structured
--   notes with extra fields. This table handles freeform cross-entity notes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Entity Relationships
--
-- source_type / target_type must match the entity_registry discriminators:
--   'npc' | 'faction' | 'location' | 'quest' | 'session' |
--   'event' | 'plot_thread' | 'asset' | 'map'
--
-- relationship_type: semantic label used by the graph module for edge colouring:
--   'disposition'  — NPC↔NPC or NPC↔Faction standing
--   'membership'   — NPC → Faction
--   'leadership'   — NPC → Faction (leads)
--   'location_link'— any entity → Location
--   'quest_link'   — any entity → Quest
--   'plot_link'    — any entity → PlotThread
--   'causality'    — Event → Event
--   'asset_link'   — Asset → any entity  (also in asset_links; kept for graph)
--   'session_link' — any entity → Session
--   'custom'       — GM-defined free-form relationship
--
-- strength: -100 (hostile) to +100 (deeply allied). NULL for non-disposition edges.
-- directed: 0 = bidirectional, 1 = source → target only
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_relationships (
    id                  TEXT     PRIMARY KEY,           -- UUID v4
    campaign_id         TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Source side
    source_id           TEXT     NOT NULL,
    source_type         TEXT     NOT NULL
                            CHECK (source_type IN (
                                'npc','faction','location','quest','session',
                                'event','plot_thread','asset','map'
                            )),

    -- Target side
    target_id           TEXT     NOT NULL,
    target_type         TEXT     NOT NULL
                            CHECK (target_type IN (
                                'npc','faction','location','quest','session',
                                'event','plot_thread','asset','map'
                            )),

    -- Relationship metadata
    relationship_type   TEXT     NOT NULL DEFAULT 'custom'
                            CHECK (relationship_type IN (
                                'disposition','membership','leadership',
                                'location_link','quest_link','plot_link',
                                'causality','asset_link','session_link','custom'
                            )),
    label               TEXT     NOT NULL DEFAULT '',   -- Human-readable description
    strength            INTEGER                         -- -100 to +100 (NULL = n/a)
                            CHECK (strength IS NULL OR (strength >= -100 AND strength <= 100)),
    directed            INTEGER  NOT NULL DEFAULT 0,    -- BOOLEAN
    note                TEXT,                           -- Optional narrative context

    created_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),

    -- Prevent exact duplicates: same pair + same type = one row
    UNIQUE (campaign_id, source_id, source_type, target_id, target_type, relationship_type)
);

-- Query: "all relationships for entity X" (both as source and target)
CREATE INDEX IF NOT EXISTS idx_entity_rel_source
    ON entity_relationships (campaign_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_entity_rel_target
    ON entity_relationships (campaign_id, target_type, target_id);

-- Query: "all relationships of type Y in campaign Z"
CREATE INDEX IF NOT EXISTS idx_entity_rel_type
    ON entity_relationships (campaign_id, relationship_type);

-- ---------------------------------------------------------------------------
-- Entity Notes
-- Universal freeform notes that can be attached to any entity.
-- Module-specific note tables take precedence for structured note types;
-- this table is the catch-all for unstructured, cross-entity notes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_notes (
    id           TEXT    PRIMARY KEY,                   -- UUID v4
    campaign_id  TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Polymorphic owner
    entity_id    TEXT    NOT NULL,
    entity_type  TEXT    NOT NULL
                     CHECK (entity_type IN (
                         'npc','faction','location','quest','session',
                         'event','plot_thread','asset','map'
                     )),

    content      TEXT    NOT NULL DEFAULT '',           -- Markdown
    -- Optional: pin this note to a campaign date or a session
    campaign_date TEXT,                                 -- CampaignDate
    session_id    TEXT   REFERENCES sessions(id) ON DELETE SET NULL,

    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_entity_notes_owner
    ON entity_notes (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_notes_campaign
    ON entity_notes (campaign_id);

CREATE INDEX IF NOT EXISTS idx_entity_notes_session
    ON entity_notes (session_id);
