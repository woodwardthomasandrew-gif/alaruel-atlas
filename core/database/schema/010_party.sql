-- =============================================================================
-- Migration 010 - Party
-- =============================================================================

CREATE TABLE IF NOT EXISTS party_members (
    id            TEXT    PRIMARY KEY,
    campaign_id   TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL,
    player_name   TEXT,
    role          TEXT    NOT NULL DEFAULT '',
    notes         TEXT    NOT NULL DEFAULT '',
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_party_members_campaign
    ON party_members (campaign_id, name);

CREATE TABLE IF NOT EXISTS party_member_gear (
    id               TEXT    PRIMARY KEY,
    party_member_id  TEXT    NOT NULL REFERENCES party_members(id) ON DELETE CASCADE,
    campaign_id      TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name             TEXT    NOT NULL,
    quantity         INTEGER NOT NULL DEFAULT 1,
    notes            TEXT    NOT NULL DEFAULT '',
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_party_member_gear_member
    ON party_member_gear (party_member_id, sort_order, name);

CREATE TABLE IF NOT EXISTS party_airships (
    id               TEXT    PRIMARY KEY,
    campaign_id      TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name             TEXT    NOT NULL,
    ship_class       TEXT    NOT NULL DEFAULT '',
    status           TEXT    NOT NULL DEFAULT '',
    current_location TEXT    NOT NULL DEFAULT '',
    notes            TEXT    NOT NULL DEFAULT '',
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (campaign_id)
);

CREATE TABLE IF NOT EXISTS party_airship_cargo (
    id               TEXT    PRIMARY KEY,
    airship_id       TEXT    NOT NULL REFERENCES party_airships(id) ON DELETE CASCADE,
    campaign_id      TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name             TEXT    NOT NULL,
    quantity         INTEGER NOT NULL DEFAULT 1,
    weight           REAL    NOT NULL DEFAULT 0,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_party_airship_cargo_airship
    ON party_airship_cargo (airship_id, sort_order, name);

CREATE TABLE IF NOT EXISTS party_pets (
    id             TEXT    PRIMARY KEY,
    campaign_id    TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name           TEXT    NOT NULL,
    species        TEXT    NOT NULL DEFAULT '',
    bonded_to      TEXT    NOT NULL DEFAULT '',
    notes          TEXT    NOT NULL DEFAULT '',
    created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_party_pets_campaign
    ON party_pets (campaign_id, name);
