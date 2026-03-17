-- =============================================================================
-- Migration 004 — Quests & Plot Threads
-- =============================================================================
-- Quests are discrete tasks. PlotThreads are narrative arcs that group quests,
-- NPCs, and events. Quest prerequisites form a directed acyclic graph modelled
-- with a self-join junction table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Plot Threads
-- Defined before quests so quests can FK to plot_threads.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plot_threads (
    id          TEXT     PRIMARY KEY,                -- UUID v4
    campaign_id TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name        TEXT     NOT NULL,
    description TEXT     NOT NULL DEFAULT '',
    status      TEXT     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','resolved','dormant','abandoned')),
    priority    INTEGER  NOT NULL DEFAULT 0,
    start_date  TEXT,                                -- CampaignDate
    end_date    TEXT,                                -- CampaignDate
    tags        TEXT     NOT NULL DEFAULT '[]',      -- JSON array
    created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_plot_threads_campaign ON plot_threads (campaign_id);

-- ---------------------------------------------------------------------------
-- Quests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quests (
    id                 TEXT     PRIMARY KEY,         -- UUID v4
    campaign_id        TEXT     NOT NULL REFERENCES campaigns(id)      ON DELETE CASCADE,
    name               TEXT     NOT NULL,
    description        TEXT     NOT NULL DEFAULT '',
    status             TEXT     NOT NULL DEFAULT 'hidden'
                           CHECK (status IN (
                               'rumour','active','on_hold','completed',
                               'failed','abandoned','hidden'
                           )),
    quest_type         TEXT     NOT NULL DEFAULT 'side'
                           CHECK (quest_type IN (
                               'main','side','personal','faction','exploration',
                               'fetch','escort','eliminate','mystery'
                           )),
    priority           INTEGER  NOT NULL DEFAULT 0,
    start_date         TEXT,                         -- CampaignDate
    end_date           TEXT,                         -- CampaignDate
    reward             TEXT,                         -- Freeform markdown
    -- Direct FKs for the most common single-value associations
    quest_giver_npc_id TEXT     REFERENCES npcs(id)         ON DELETE SET NULL,
    sponsor_faction_id TEXT     REFERENCES factions(id)     ON DELETE SET NULL,
    plot_thread_id     TEXT     REFERENCES plot_threads(id) ON DELETE SET NULL,
    tags               TEXT     NOT NULL DEFAULT '[]',       -- JSON array
    created_at         TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at         TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_quests_campaign     ON quests (campaign_id);
CREATE INDEX IF NOT EXISTS idx_quests_status       ON quests (status);
CREATE INDEX IF NOT EXISTS idx_quests_plot_thread  ON quests (plot_thread_id);
CREATE INDEX IF NOT EXISTS idx_quests_giver        ON quests (quest_giver_npc_id);

-- ---------------------------------------------------------------------------
-- Quest Objectives
-- Ordered sub-tasks within a quest. Stored as rows for queryability.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quest_objectives (
    id          TEXT     PRIMARY KEY,
    quest_id    TEXT     NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    description TEXT     NOT NULL DEFAULT '',
    completed   INTEGER  NOT NULL DEFAULT 0,          -- BOOLEAN
    required    INTEGER  NOT NULL DEFAULT 1,          -- BOOLEAN
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    deadline    TEXT                                  -- CampaignDate
);

CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives (quest_id);

-- ---------------------------------------------------------------------------
-- Quest Notes
-- GM notes (optionally visible to players) attached to a quest.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quest_notes (
    id                  TEXT     PRIMARY KEY,
    quest_id            TEXT     NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    content             TEXT     NOT NULL DEFAULT '',
    visible_to_players  INTEGER  NOT NULL DEFAULT 0,  -- BOOLEAN
    created_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_quest_notes_quest ON quest_notes (quest_id);

-- ---------------------------------------------------------------------------
-- Quest Prerequisites  (self-join many-to-many)
-- Directed: prerequisite_quest_id must be completed before quest_id unlocks.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quest_prerequisites (
    quest_id              TEXT  NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    prerequisite_quest_id TEXT  NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    PRIMARY KEY (quest_id, prerequisite_quest_id),
    CHECK (quest_id != prerequisite_quest_id)         -- no self-loops
);

CREATE INDEX IF NOT EXISTS idx_quest_prereqs_prereq
    ON quest_prerequisites (prerequisite_quest_id);

-- ---------------------------------------------------------------------------
-- Quest ↔ NPC involvement  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quest_npcs (
    quest_id    TEXT  NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    npc_id      TEXT  NOT NULL REFERENCES npcs(id)   ON DELETE CASCADE,
    role_label  TEXT,                                 -- e.g. 'target', 'contact', 'ally'
    PRIMARY KEY (quest_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_npcs_npc ON quest_npcs (npc_id);

-- ---------------------------------------------------------------------------
-- Quest ↔ Location  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quest_locations (
    quest_id    TEXT     NOT NULL REFERENCES quests(id)    ON DELETE CASCADE,
    location_id TEXT     NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    PRIMARY KEY (quest_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_locations_location ON quest_locations (location_id);

-- ---------------------------------------------------------------------------
-- Plot Thread ↔ NPC  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plot_thread_npcs (
    plot_thread_id TEXT  NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    npc_id         TEXT  NOT NULL REFERENCES npcs(id)         ON DELETE CASCADE,
    is_key_actor   INTEGER NOT NULL DEFAULT 0,                -- BOOLEAN
    PRIMARY KEY (plot_thread_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_plot_thread_npcs_npc ON plot_thread_npcs (npc_id);

-- ---------------------------------------------------------------------------
-- Plot Thread ↔ Faction  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plot_thread_factions (
    plot_thread_id TEXT  NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    faction_id     TEXT  NOT NULL REFERENCES factions(id)     ON DELETE CASCADE,
    is_key_actor   INTEGER NOT NULL DEFAULT 0,                -- BOOLEAN
    PRIMARY KEY (plot_thread_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_plot_thread_factions_faction ON plot_thread_factions (faction_id);

-- ---------------------------------------------------------------------------
-- Plot Thread ↔ Location  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plot_thread_locations (
    plot_thread_id TEXT  NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    location_id    TEXT  NOT NULL REFERENCES locations(id)    ON DELETE CASCADE,
    PRIMARY KEY (plot_thread_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_plot_thread_locations_location ON plot_thread_locations (location_id);
