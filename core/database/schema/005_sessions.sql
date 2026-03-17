-- =============================================================================
-- Migration 005 — Sessions
-- =============================================================================
-- Sessions are the real-world play record. They are the temporal spine of the
-- campaign — nearly every other entity cross-references them.
-- Scenes, notes, and prep items are child rows, not JSON blobs, so they can
-- be individually edited and queried.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id                   TEXT     PRIMARY KEY,           -- UUID v4
    campaign_id          TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                 TEXT     NOT NULL,
    description          TEXT     NOT NULL DEFAULT '',
    session_number       INTEGER  NOT NULL DEFAULT 0,
    status               TEXT     NOT NULL DEFAULT 'planned'
                             CHECK (status IN ('planned','in_progress','completed','cancelled')),
    -- Real-world timestamps
    scheduled_at         TEXT,                           -- ISO-8601
    started_at           TEXT,                           -- ISO-8601
    ended_at             TEXT,                           -- ISO-8601
    duration_minutes     INTEGER,
    -- In-world timestamps
    campaign_date_start  TEXT,                           -- CampaignDate
    campaign_date_end    TEXT,                           -- CampaignDate
    -- Outcome fields
    rewards              TEXT,                           -- Markdown
    follow_up_hooks      TEXT,                           -- Markdown
    tags                 TEXT     NOT NULL DEFAULT '[]', -- JSON array
    created_at           TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at           TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status   ON sessions (status);
CREATE INDEX IF NOT EXISTS idx_sessions_number   ON sessions (campaign_id, session_number);

-- ---------------------------------------------------------------------------
-- Session Notes
-- Three-phase notes: planning (before), live (during), recap (after).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_notes (
    id          TEXT     PRIMARY KEY,
    session_id  TEXT     NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    phase       TEXT     NOT NULL DEFAULT 'planning'
                    CHECK (phase IN ('planning','live','recap')),
    content     TEXT     NOT NULL DEFAULT '',
    created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes (session_id);

-- ---------------------------------------------------------------------------
-- Session Prep Items
-- Checklist of things the GM must prepare before the session.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_prep_items (
    id          TEXT     PRIMARY KEY,
    session_id  TEXT     NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    description TEXT     NOT NULL DEFAULT '',
    done        INTEGER  NOT NULL DEFAULT 0,           -- BOOLEAN
    sort_order  INTEGER  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_prep_session ON session_prep_items (session_id);

-- ---------------------------------------------------------------------------
-- Session Scenes
-- Ordered encounter / narrative beat blocks within a session.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_scenes (
    id          TEXT     PRIMARY KEY,
    session_id  TEXT     NOT NULL REFERENCES sessions(id)  ON DELETE CASCADE,
    title       TEXT     NOT NULL DEFAULT '',
    content     TEXT     NOT NULL DEFAULT '',
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    location_id TEXT     REFERENCES locations(id) ON DELETE SET NULL,
    played      INTEGER  NOT NULL DEFAULT 0                -- BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_session_scenes_session  ON session_scenes (session_id);
CREATE INDEX IF NOT EXISTS idx_session_scenes_location ON session_scenes (location_id);

-- ---------------------------------------------------------------------------
-- Session Scene ↔ NPC  (many-to-many)
-- Records which NPCs appear in each scene.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_scene_npcs (
    scene_id  TEXT  NOT NULL REFERENCES session_scenes(id) ON DELETE CASCADE,
    npc_id    TEXT  NOT NULL REFERENCES npcs(id)           ON DELETE CASCADE,
    PRIMARY KEY (scene_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_scene_npcs_npc ON session_scene_npcs (npc_id);

-- ---------------------------------------------------------------------------
-- Session ↔ Quest  (many-to-many)
-- Tracks both "advanced" and "completed" quest states per session.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_quests (
    session_id   TEXT  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    quest_id     TEXT  NOT NULL REFERENCES quests(id)   ON DELETE CASCADE,
    -- 'advanced': quest progressed. 'completed': quest finished this session.
    outcome      TEXT  NOT NULL DEFAULT 'advanced'
                     CHECK (outcome IN ('advanced','completed')),
    PRIMARY KEY (session_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_session_quests_quest ON session_quests (quest_id);

-- ---------------------------------------------------------------------------
-- Session ↔ NPC  (many-to-many)
-- Featured NPCs at the session level (aggregated from scenes + manual adds).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_npcs (
    session_id  TEXT  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    npc_id      TEXT  NOT NULL REFERENCES npcs(id)     ON DELETE CASCADE,
    PRIMARY KEY (session_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_session_npcs_npc ON session_npcs (npc_id);

-- ---------------------------------------------------------------------------
-- Session ↔ Location  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_locations (
    session_id  TEXT  NOT NULL REFERENCES sessions(id)  ON DELETE CASCADE,
    location_id TEXT  NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_session_locations_location ON session_locations (location_id);

-- ---------------------------------------------------------------------------
-- Session ↔ Plot Thread  (many-to-many)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_plot_threads (
    session_id     TEXT  NOT NULL REFERENCES sessions(id)     ON DELETE CASCADE,
    plot_thread_id TEXT  NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, plot_thread_id)
);

CREATE INDEX IF NOT EXISTS idx_session_plot_threads_thread ON session_plot_threads (plot_thread_id);
