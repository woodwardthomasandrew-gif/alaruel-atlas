-- =============================================================================
-- Migration 006 — Campaign Events
-- =============================================================================
-- CampaignEvents are the atoms of the timeline. They form a causal graph via
-- the event_causality self-join table, allowing the timeline module to draw
-- cause-and-effect chains between events.
--
-- Named 'campaign_events' to avoid collision with SQLite's reserved word
-- and with AppEvent (the system event bus message type).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Campaign Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_events (
    id               TEXT     PRIMARY KEY,             -- UUID v4
    campaign_id      TEXT     NOT NULL REFERENCES campaigns(id)     ON DELETE CASCADE,
    name             TEXT     NOT NULL,
    description      TEXT     NOT NULL DEFAULT '',
    event_type       TEXT     NOT NULL DEFAULT 'other'
                         CHECK (event_type IN (
                             'battle','political','discovery','death','birth',
                             'quest','faction','natural','social','mystery','other'
                         )),
    significance     TEXT     NOT NULL DEFAULT 'minor'
                         CHECK (significance IN ('trivial','minor','moderate','major','critical')),
    -- Temporal placement
    campaign_date    TEXT,                             -- CampaignDate (nullable = unknown)
    campaign_date_end TEXT,                            -- For duration events
    certainty        TEXT     NOT NULL DEFAULT 'exact'
                         CHECK (certainty IN ('exact','approximate','unknown','legendary')),
    is_player_facing INTEGER  NOT NULL DEFAULT 1,      -- BOOLEAN
    -- Single-value FKs for the most common associations
    location_id      TEXT     REFERENCES locations(id)    ON DELETE SET NULL,
    quest_id         TEXT     REFERENCES quests(id)       ON DELETE SET NULL,
    plot_thread_id   TEXT     REFERENCES plot_threads(id) ON DELETE SET NULL,
    session_id       TEXT     REFERENCES sessions(id)     ON DELETE SET NULL,
    tags             TEXT     NOT NULL DEFAULT '[]',   -- JSON array
    created_at       TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign     ON campaign_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type         ON campaign_events (event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_significance ON campaign_events (significance);
CREATE INDEX IF NOT EXISTS idx_campaign_events_session      ON campaign_events (session_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_plot_thread  ON campaign_events (plot_thread_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_location     ON campaign_events (location_id);

-- ---------------------------------------------------------------------------
-- Event Causality  (self-join many-to-many)
-- Directed: cause_event_id → effect_event_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_causality (
    cause_event_id  TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    effect_event_id TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    PRIMARY KEY (cause_event_id, effect_event_id),
    CHECK (cause_event_id != effect_event_id)           -- no self-loops
);

CREATE INDEX IF NOT EXISTS idx_event_causality_effect ON event_causality (effect_event_id);

-- ---------------------------------------------------------------------------
-- Campaign Event ↔ NPC  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_event_npcs (
    event_id    TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    npc_id      TEXT  NOT NULL REFERENCES npcs(id)            ON DELETE CASCADE,
    role_label  TEXT,                                          -- e.g. 'victim', 'instigator'
    PRIMARY KEY (event_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_event_npcs_npc ON campaign_event_npcs (npc_id);

-- ---------------------------------------------------------------------------
-- Campaign Event ↔ Faction  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_event_factions (
    event_id   TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    faction_id TEXT  NOT NULL REFERENCES factions(id)        ON DELETE CASCADE,
    PRIMARY KEY (event_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_event_factions_faction ON campaign_event_factions (faction_id);
