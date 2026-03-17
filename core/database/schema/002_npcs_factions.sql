-- =============================================================================
-- Migration 002 — NPCs & Factions
-- =============================================================================
-- NPCs and Factions are the most cross-referenced entities in the system.
-- Shared arrays (faction membership, quest involvement, etc.) live in
-- dedicated junction tables rather than JSON columns so they can be indexed
-- and queried relationally.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- NPCs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npcs (
    id                           TEXT    PRIMARY KEY,    -- UUID v4
    campaign_id                  TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                         TEXT    NOT NULL,
    alias                        TEXT,
    description                  TEXT    NOT NULL DEFAULT '',
    role                         TEXT    NOT NULL DEFAULT 'neutral'
                                     CHECK (role IN (
                                         'ally','antagonist','neutral','informant',
                                         'questgiver','merchant','recurring','minor'
                                     )),
    vital_status                 TEXT    NOT NULL DEFAULT 'alive'
                                     CHECK (vital_status IN ('alive','dead','missing','unknown')),
    disposition_towards_players  TEXT    NOT NULL DEFAULT 'neutral'
                                     CHECK (disposition_towards_players IN (
                                         'hostile','unfriendly','neutral','friendly','allied'
                                     )),
    -- Current location: denormalised FK for fast "NPCs at location X" queries.
    -- Full history of location associations lives in npc_locations.
    current_location_id          TEXT    REFERENCES locations(id) ON DELETE SET NULL,
    primary_faction_id           TEXT    REFERENCES factions(id)  ON DELETE SET NULL,
    portrait_asset_id            TEXT    REFERENCES assets(id)     ON DELETE SET NULL,
    tags                         TEXT    NOT NULL DEFAULT '[]',     -- JSON array
    created_at                   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at                   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_npcs_campaign      ON npcs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_npcs_location      ON npcs (current_location_id);
CREATE INDEX IF NOT EXISTS idx_npcs_faction       ON npcs (primary_faction_id);

-- ---------------------------------------------------------------------------
-- NPC Notes
-- Private GM notes attached to a single NPC.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc_notes (
    id             TEXT    PRIMARY KEY,
    npc_id         TEXT    NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
    campaign_id    TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    content        TEXT    NOT NULL DEFAULT '',
    campaign_date  TEXT,                                -- In-world date (free text)
    created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_npc_notes_npc ON npc_notes (npc_id);

-- ---------------------------------------------------------------------------
-- Factions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS factions (
    id                      TEXT    PRIMARY KEY,          -- UUID v4
    campaign_id             TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                    TEXT    NOT NULL,
    abbreviation            TEXT,
    description             TEXT    NOT NULL DEFAULT '',
    status                  TEXT    NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','inactive','archived')),
    leader_npc_id           TEXT    REFERENCES npcs(id) ON DELETE SET NULL,
    headquarters_location_id TEXT   REFERENCES locations(id) ON DELETE SET NULL,
    symbol_asset_id         TEXT    REFERENCES assets(id)    ON DELETE SET NULL,
    tags                    TEXT    NOT NULL DEFAULT '[]',  -- JSON array
    created_at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_factions_campaign ON factions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_factions_leader   ON factions (leader_npc_id);

-- ---------------------------------------------------------------------------
-- NPC ↔ Faction membership  (many-to-many)
-- An NPC can belong to multiple factions; a faction has many members.
-- The primary faction is stored as a direct FK on the npc row for speed;
-- this table stores all memberships including the primary one.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc_factions (
    npc_id       TEXT  NOT NULL REFERENCES npcs(id)     ON DELETE CASCADE,
    faction_id   TEXT  NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
    is_primary   INTEGER NOT NULL DEFAULT 0,             -- BOOLEAN
    role_in_faction TEXT,                                -- e.g. 'spy', 'elder', 'foot soldier'
    joined_date  TEXT,                                   -- CampaignDate
    PRIMARY KEY (npc_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_npc_factions_faction ON npc_factions (faction_id);

-- ---------------------------------------------------------------------------
-- NPC ↔ Location association  (many-to-many)
-- current_location_id on the npc row is the fast "where is this NPC now"
-- lookup. This table stores all associated locations (home, workplace, etc.)
-- with an ordering column so the first entry is the primary association.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS npc_locations (
    npc_id       TEXT     NOT NULL REFERENCES npcs(id)      ON DELETE CASCADE,
    location_id  TEXT     NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    sort_order   INTEGER  NOT NULL DEFAULT 0,
    role_label   TEXT,                                      -- e.g. 'home', 'workplace'
    PRIMARY KEY (npc_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_npc_locations_location ON npc_locations (location_id);

-- ---------------------------------------------------------------------------
-- Faction ↔ Location control  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faction_locations (
    faction_id     TEXT  NOT NULL REFERENCES factions(id)   ON DELETE CASCADE,
    location_id    TEXT  NOT NULL REFERENCES locations(id)  ON DELETE CASCADE,
    is_hq          INTEGER NOT NULL DEFAULT 0,              -- BOOLEAN
    presence_level TEXT  NOT NULL DEFAULT 'notable'
                       CHECK (presence_level IN ('nominal','notable','controlling')),
    PRIMARY KEY (faction_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_faction_locations_location ON faction_locations (location_id);
