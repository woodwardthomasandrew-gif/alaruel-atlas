-- =============================================================================
-- Migration 007 — Assets
-- =============================================================================
-- Assets are the binary file store (images, audio, PDFs).
-- The core/assets AssetManager owns this table; all other modules reference
-- assets by virtual_path or id but never touch this table directly.
--
-- NOTE: This migration is registered by core/assets, not by a feature module.
-- It is defined early so the FKs in later tables (npcs.portrait_asset_id,
-- factions.symbol_asset_id, etc.) can reference it.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Assets
-- Content-addressed: hash (SHA-256) is UNIQUE → deduplication guarantee.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    id           TEXT     PRIMARY KEY,              -- UUID v4
    campaign_id  TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name         TEXT     NOT NULL,
    category     TEXT     NOT NULL DEFAULT 'misc'
                     CHECK (category IN ('maps','portraits','audio','documents','misc')),
    mime_type    TEXT     NOT NULL,
    hash         TEXT     NOT NULL,                 -- SHA-256 hex (unique per campaign)
    size_bytes   INTEGER  NOT NULL DEFAULT 0,
    virtual_path TEXT     NOT NULL,                 -- asset://<category>/<id>.<ext>
    disk_path    TEXT     NOT NULL,                 -- Absolute OS path
    width_px     INTEGER,                           -- image assets only
    height_px    INTEGER,                           -- image assets only
    duration_sec REAL,                              -- audio assets only
    tags         TEXT     NOT NULL DEFAULT '[]',    -- JSON array
    created_at   TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at   TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (campaign_id, hash)                      -- no duplicate files per campaign
);

CREATE INDEX IF NOT EXISTS idx_assets_campaign  ON assets (campaign_id);
CREATE INDEX IF NOT EXISTS idx_assets_category  ON assets (campaign_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_virtual_path ON assets (virtual_path);

-- ---------------------------------------------------------------------------
-- Asset Links
-- Polymorphic junction: links any asset to any entity via the entity_registry.
-- The (asset_id, entity_module, entity_id, role) tuple is the natural PK.
--
-- entity_module = the module that owns the entity ('npcs', 'atlas', 'quests'…)
-- role          = semantic position ('portrait', 'map', 'handout', 'thumbnail'…)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asset_links (
    asset_id      TEXT  NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    entity_module TEXT  NOT NULL,
    entity_id     TEXT  NOT NULL,
    role          TEXT  NOT NULL DEFAULT 'attachment',
    PRIMARY KEY (asset_id, entity_module, entity_id, role)
);

-- Both query directions are equally common:
--   "all assets for entity X"  → idx_asset_links_entity
--   "all entities for asset Y" → primary key covers asset_id
CREATE INDEX IF NOT EXISTS idx_asset_links_entity
    ON asset_links (entity_module, entity_id);
