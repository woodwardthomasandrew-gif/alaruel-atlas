-- =============================================================================
-- Migration 001 — Campaign & Entity Registry
-- =============================================================================
-- The campaign table is the root of the entire schema.
-- Every entity row in every table carries a campaign_id FK.
--
-- The entity_registry table provides the polymorphic backbone: any table
-- that wants to participate in entity_relationships, asset_links, or
-- entity_notes registers a row here first. The registry's (id, entity_type)
-- pair is the universal "pointer" used everywhere else.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Campaign
-- One SQLite file = one campaign. This row is created once on file creation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id                   TEXT     PRIMARY KEY,          -- UUID v4
    name                 TEXT     NOT NULL,
    subtitle             TEXT,
    description          TEXT     NOT NULL DEFAULT '',
    gm_name              TEXT,
    player_names         TEXT     NOT NULL DEFAULT '[]', -- JSON array of strings
    status               TEXT     NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','hiatus','concluded','abandoned')),
    system               TEXT     NOT NULL DEFAULT '',
    calendar_system      TEXT     NOT NULL DEFAULT 'Gregorian',
    show_real_dates      INTEGER  NOT NULL DEFAULT 1,   -- BOOLEAN (0/1)
    quests_default_public INTEGER NOT NULL DEFAULT 0,
    auto_link_session_npcs INTEGER NOT NULL DEFAULT 1,
    module_settings      TEXT     NOT NULL DEFAULT '{}', -- JSON object
    cover_asset_id       TEXT,                          -- FK → assets.id (nullable)
    tags                 TEXT     NOT NULL DEFAULT '[]', -- JSON array
    started_at           TEXT,                          -- ISO-8601
    concluded_at         TEXT,                          -- ISO-8601
    created_at           TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at           TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------------
-- Entity Registry
-- Every entity type registers itself here on INSERT so the polymorphic
-- relationship and notes tables have a single stable anchor.
--
-- entity_type must match the discriminator used in entity_relationships:
--   'npc' | 'faction' | 'location' | 'quest' | 'session' | 'event' |
--   'plot_thread' | 'asset' | 'map'
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_registry (
    id           TEXT  NOT NULL,   -- Same UUID as the owning entity row
    entity_type  TEXT  NOT NULL    CHECK (entity_type IN (
                     'npc','faction','location','quest','session',
                     'event','plot_thread','asset','map'
                 )),
    campaign_id  TEXT  NOT NULL    REFERENCES campaigns(id) ON DELETE CASCADE,
    PRIMARY KEY (id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_entity_registry_campaign
    ON entity_registry (campaign_id, entity_type);
