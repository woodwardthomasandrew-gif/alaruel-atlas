-- =============================================================================
-- Migration 003 — Locations & Maps
-- =============================================================================
-- Locations form a self-referential hierarchy (world → continent → … → room).
-- Maps are image assets displayed in the atlas; they carry pin data linking
-- them to Locations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id                       TEXT    PRIMARY KEY,          -- UUID v4
    campaign_id              TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                     TEXT    NOT NULL,
    description              TEXT    NOT NULL DEFAULT '',
    location_type            TEXT    NOT NULL DEFAULT 'other'
                                 CHECK (location_type IN (
                                     'world','continent','region','nation','city',
                                     'town','village','district','building',
                                     'dungeon','wilderness','landmark','other'
                                 )),
    status                   TEXT    NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','inactive','archived')),
    -- Hierarchy: NULL parent = root world node
    parent_location_id       TEXT    REFERENCES locations(id) ON DELETE SET NULL,
    controlling_faction_id   TEXT    REFERENCES factions(id)  ON DELETE SET NULL,
    thumbnail_asset_id       TEXT    REFERENCES assets(id)    ON DELETE SET NULL,
    tags                     TEXT    NOT NULL DEFAULT '[]',   -- JSON array
    created_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent   ON locations (parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_faction  ON locations (controlling_faction_id);

-- ---------------------------------------------------------------------------
-- Maps
-- A Map is a visual canvas (image file) with Location pins placed on it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maps (
    id                  TEXT     PRIMARY KEY,             -- UUID v4
    campaign_id         TEXT     NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
    name                TEXT     NOT NULL,
    description         TEXT     NOT NULL DEFAULT '',
    image_asset_id      TEXT     NOT NULL REFERENCES assets(id)     ON DELETE RESTRICT,
    width_px            INTEGER  NOT NULL DEFAULT 0,
    height_px           INTEGER  NOT NULL DEFAULT 0,
    -- The Location this map primarily depicts (e.g. a city map → the city)
    subject_location_id TEXT     REFERENCES locations(id) ON DELETE SET NULL,
    scale               TEXT,                             -- e.g. '1 hex = 6 miles'
    tags                TEXT     NOT NULL DEFAULT '[]',   -- JSON array
    created_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_maps_campaign  ON maps (campaign_id);
CREATE INDEX IF NOT EXISTS idx_maps_subject   ON maps (subject_location_id);

-- ---------------------------------------------------------------------------
-- Location Pins
-- Places a Location marker on a specific Map at pixel coordinates.
-- One Location can appear on multiple maps; one map can hold many pins.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS location_pins (
    id           TEXT     PRIMARY KEY,
    map_id       TEXT     NOT NULL REFERENCES maps(id)      ON DELETE CASCADE,
    location_id  TEXT     NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    -- Pixel coordinates on the map canvas (origin = top-left)
    pos_x        REAL     NOT NULL DEFAULT 0,
    pos_y        REAL     NOT NULL DEFAULT 0,
    -- Override label; NULL falls back to location.name
    label        TEXT,
    UNIQUE (map_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_pins_map      ON location_pins (map_id);
CREATE INDEX IF NOT EXISTS idx_pins_location ON location_pins (location_id);
