-- =============================================================================
-- Alaruel Atlas — Full SQLite Schema
-- schema/full.sql  (auto-assembled from migrations 001–009)
--
-- Apply once to a fresh campaign file:
--   sqlite3 campaign.db < schema/full.sql
--
-- For incremental updates use the numbered migrations via DatabaseManager.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Migration tracking ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _migrations (
    version     INTEGER PRIMARY KEY,
    module      TEXT    NOT NULL,
    description TEXT    NOT NULL,
    applied_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ── 001 Campaign & Entity Registry ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
    id                    TEXT     PRIMARY KEY,
    name                  TEXT     NOT NULL,
    subtitle              TEXT,
    description           TEXT     NOT NULL DEFAULT '',
    gm_name               TEXT,
    player_names          TEXT     NOT NULL DEFAULT '[]',
    status                TEXT     NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','hiatus','concluded','abandoned')),
    system                TEXT     NOT NULL DEFAULT '',
    calendar_system       TEXT     NOT NULL DEFAULT 'Gregorian',
    show_real_dates       INTEGER  NOT NULL DEFAULT 1,
    quests_default_public INTEGER  NOT NULL DEFAULT 0,
    auto_link_session_npcs INTEGER NOT NULL DEFAULT 1,
    module_settings       TEXT     NOT NULL DEFAULT '{}',
    cover_asset_id        TEXT,
    tags                  TEXT     NOT NULL DEFAULT '[]',
    started_at            TEXT,
    concluded_at          TEXT,
    created_at            TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at            TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS entity_registry (
    id          TEXT  NOT NULL,
    entity_type TEXT  NOT NULL CHECK (entity_type IN (
                    'npc','faction','location','quest','session',
                    'event','plot_thread','asset','map'
                )),
    campaign_id TEXT  NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    PRIMARY KEY (id, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_entity_registry_campaign
    ON entity_registry (campaign_id, entity_type);

-- ── 007 Assets (must precede tables that FK to assets) ───────────────────────

CREATE TABLE IF NOT EXISTS assets (
    id           TEXT     PRIMARY KEY,
    campaign_id  TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name         TEXT     NOT NULL,
    category     TEXT     NOT NULL DEFAULT 'misc'
                     CHECK (category IN ('maps','portraits','audio','documents','misc')),
    mime_type    TEXT     NOT NULL,
    hash         TEXT     NOT NULL,
    size_bytes   INTEGER  NOT NULL DEFAULT 0,
    virtual_path TEXT     NOT NULL,
    disk_path    TEXT     NOT NULL,
    width_px     INTEGER,
    height_px    INTEGER,
    duration_sec REAL,
    tags         TEXT     NOT NULL DEFAULT '[]',
    created_at   TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at   TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (campaign_id, hash)
);

CREATE INDEX IF NOT EXISTS idx_assets_campaign ON assets (campaign_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets (campaign_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_virtual_path ON assets (virtual_path);

CREATE TABLE IF NOT EXISTS asset_links (
    asset_id      TEXT  NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    entity_module TEXT  NOT NULL,
    entity_id     TEXT  NOT NULL,
    role          TEXT  NOT NULL DEFAULT 'attachment',
    PRIMARY KEY (asset_id, entity_module, entity_id, role)
);

CREATE INDEX IF NOT EXISTS idx_asset_links_entity
    ON asset_links (entity_module, entity_id);

-- ── 002 NPCs & Factions ───────────────────────────────────────────────────────
-- NOTE: npcs.current_location_id and factions.headquarters_location_id
-- reference locations which is created in 003. SQLite defers FK validation
-- to commit time when foreign_keys=ON, so forward references are fine as long
-- as rows aren't inserted before the referenced table exists. The migration
-- runner applies files in order; these FKs are safe.

CREATE TABLE IF NOT EXISTS npcs (
    id                          TEXT    PRIMARY KEY,
    campaign_id                 TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                        TEXT    NOT NULL,
    alias                       TEXT,
    description                 TEXT    NOT NULL DEFAULT '',
    role                        TEXT    NOT NULL DEFAULT 'neutral'
                                    CHECK (role IN (
                                        'ally','antagonist','neutral','informant',
                                        'questgiver','merchant','recurring','minor'
                                    )),
    vital_status                TEXT    NOT NULL DEFAULT 'alive'
                                    CHECK (vital_status IN ('alive','dead','missing','unknown')),
    disposition_towards_players TEXT    NOT NULL DEFAULT 'neutral'
                                    CHECK (disposition_towards_players IN (
                                        'hostile','unfriendly','neutral','friendly','allied'
                                    )),
    current_location_id         TEXT,                   -- FK deferred; see note above
    primary_faction_id          TEXT,
    portrait_asset_id           TEXT    REFERENCES assets(id) ON DELETE SET NULL,
    tags                        TEXT    NOT NULL DEFAULT '[]',
    created_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_npcs_campaign  ON npcs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_npcs_location  ON npcs (current_location_id);
CREATE INDEX IF NOT EXISTS idx_npcs_faction   ON npcs (primary_faction_id);

CREATE TABLE IF NOT EXISTS npc_notes (
    id            TEXT    PRIMARY KEY,
    npc_id        TEXT    NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
    campaign_id   TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    content       TEXT    NOT NULL DEFAULT '',
    campaign_date TEXT,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_npc_notes_npc ON npc_notes (npc_id);

CREATE TABLE IF NOT EXISTS factions (
    id                       TEXT    PRIMARY KEY,
    campaign_id              TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                     TEXT    NOT NULL,
    abbreviation             TEXT,
    description              TEXT    NOT NULL DEFAULT '',
    status                   TEXT    NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','inactive','archived')),
    leader_npc_id            TEXT    REFERENCES npcs(id)     ON DELETE SET NULL,
    headquarters_location_id TEXT,                           -- FK deferred
    symbol_asset_id          TEXT    REFERENCES assets(id)   ON DELETE SET NULL,
    tags                     TEXT    NOT NULL DEFAULT '[]',
    created_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_factions_campaign ON factions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_factions_leader   ON factions (leader_npc_id);

CREATE TABLE IF NOT EXISTS npc_factions (
    npc_id          TEXT    NOT NULL REFERENCES npcs(id)     ON DELETE CASCADE,
    faction_id      TEXT    NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
    is_primary      INTEGER NOT NULL DEFAULT 0,
    role_in_faction TEXT,
    joined_date     TEXT,
    PRIMARY KEY (npc_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_npc_factions_faction ON npc_factions (faction_id);

CREATE TABLE IF NOT EXISTS npc_locations (
    npc_id      TEXT     NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
    location_id TEXT     NOT NULL,                     -- FK deferred
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    role_label  TEXT,
    PRIMARY KEY (npc_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_npc_locations_location ON npc_locations (location_id);

CREATE TABLE IF NOT EXISTS faction_locations (
    faction_id     TEXT    NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
    location_id    TEXT    NOT NULL,                        -- FK deferred
    is_hq          INTEGER NOT NULL DEFAULT 0,
    presence_level TEXT    NOT NULL DEFAULT 'notable'
                       CHECK (presence_level IN ('nominal','notable','controlling')),
    PRIMARY KEY (faction_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_faction_locations_location ON faction_locations (location_id);

-- ── 003 Locations & Maps ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS locations (
    id                     TEXT    PRIMARY KEY,
    campaign_id            TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                   TEXT    NOT NULL,
    description            TEXT    NOT NULL DEFAULT '',
    location_type          TEXT    NOT NULL DEFAULT 'other'
                               CHECK (location_type IN (
                                   'world','continent','region','nation','city',
                                   'town','village','district','building',
                                   'dungeon','wilderness','landmark','other'
                               )),
    status                 TEXT    NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive','archived')),
    parent_location_id     TEXT    REFERENCES locations(id) ON DELETE SET NULL,
    controlling_faction_id TEXT    REFERENCES factions(id)  ON DELETE SET NULL,
    thumbnail_asset_id     TEXT    REFERENCES assets(id)    ON DELETE SET NULL,
    tags                   TEXT    NOT NULL DEFAULT '[]',
    created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent   ON locations (parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_faction  ON locations (controlling_faction_id);

CREATE TABLE IF NOT EXISTS maps (
    id                  TEXT     PRIMARY KEY,
    campaign_id         TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                TEXT     NOT NULL,
    description         TEXT     NOT NULL DEFAULT '',
    image_asset_id      TEXT     NOT NULL REFERENCES assets(id)    ON DELETE RESTRICT,
    width_px            INTEGER  NOT NULL DEFAULT 0,
    height_px           INTEGER  NOT NULL DEFAULT 0,
    subject_location_id TEXT     REFERENCES locations(id) ON DELETE SET NULL,
    scale               TEXT,
    tags                TEXT     NOT NULL DEFAULT '[]',
    created_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_maps_campaign ON maps (campaign_id);
CREATE INDEX IF NOT EXISTS idx_maps_subject  ON maps (subject_location_id);

CREATE TABLE IF NOT EXISTS location_pins (
    id          TEXT  PRIMARY KEY,
    map_id      TEXT  NOT NULL REFERENCES maps(id)      ON DELETE CASCADE,
    location_id TEXT  NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    pos_x       REAL  NOT NULL DEFAULT 0,
    pos_y       REAL  NOT NULL DEFAULT 0,
    label       TEXT,
    UNIQUE (map_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_pins_map      ON location_pins (map_id);
CREATE INDEX IF NOT EXISTS idx_pins_location ON location_pins (location_id);

-- ── 004 Quests & Plot Threads ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plot_threads (
    id          TEXT     PRIMARY KEY,
    campaign_id TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name        TEXT     NOT NULL,
    description TEXT     NOT NULL DEFAULT '',
    status      TEXT     NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','resolved','dormant','abandoned')),
    priority    INTEGER  NOT NULL DEFAULT 0,
    start_date  TEXT,
    end_date    TEXT,
    tags        TEXT     NOT NULL DEFAULT '[]',
    created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_plot_threads_campaign ON plot_threads (campaign_id);

CREATE TABLE IF NOT EXISTS quests (
    id                 TEXT     PRIMARY KEY,
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
    start_date         TEXT,
    end_date           TEXT,
    reward             TEXT,
    quest_giver_npc_id TEXT     REFERENCES npcs(id)         ON DELETE SET NULL,
    sponsor_faction_id TEXT     REFERENCES factions(id)     ON DELETE SET NULL,
    plot_thread_id     TEXT     REFERENCES plot_threads(id) ON DELETE SET NULL,
    tags               TEXT     NOT NULL DEFAULT '[]',
    created_at         TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at         TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_quests_campaign    ON quests (campaign_id);
CREATE INDEX IF NOT EXISTS idx_quests_status      ON quests (status);
CREATE INDEX IF NOT EXISTS idx_quests_plot_thread ON quests (plot_thread_id);
CREATE INDEX IF NOT EXISTS idx_quests_giver       ON quests (quest_giver_npc_id);

CREATE TABLE IF NOT EXISTS quest_objectives (
    id          TEXT     PRIMARY KEY,
    quest_id    TEXT     NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    description TEXT     NOT NULL DEFAULT '',
    completed   INTEGER  NOT NULL DEFAULT 0,
    required    INTEGER  NOT NULL DEFAULT 1,
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    deadline    TEXT
);

CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives (quest_id);

CREATE TABLE IF NOT EXISTS quest_notes (
    id                 TEXT     PRIMARY KEY,
    quest_id           TEXT     NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    content            TEXT     NOT NULL DEFAULT '',
    visible_to_players INTEGER  NOT NULL DEFAULT 0,
    created_at         TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_quest_notes_quest ON quest_notes (quest_id);

CREATE TABLE IF NOT EXISTS quest_prerequisites (
    quest_id              TEXT  NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    prerequisite_quest_id TEXT  NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    PRIMARY KEY (quest_id, prerequisite_quest_id),
    CHECK (quest_id != prerequisite_quest_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_prereqs_prereq
    ON quest_prerequisites (prerequisite_quest_id);

CREATE TABLE IF NOT EXISTS quest_npcs (
    quest_id   TEXT  NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    npc_id     TEXT  NOT NULL REFERENCES npcs(id)   ON DELETE CASCADE,
    role_label TEXT,
    PRIMARY KEY (quest_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_npcs_npc ON quest_npcs (npc_id);

CREATE TABLE IF NOT EXISTS quest_locations (
    quest_id    TEXT     NOT NULL REFERENCES quests(id)    ON DELETE CASCADE,
    location_id TEXT     NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    PRIMARY KEY (quest_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_locations_location ON quest_locations (location_id);

CREATE TABLE IF NOT EXISTS plot_thread_npcs (
    plot_thread_id TEXT    NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    npc_id         TEXT    NOT NULL REFERENCES npcs(id)         ON DELETE CASCADE,
    is_key_actor   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (plot_thread_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_plot_thread_npcs_npc ON plot_thread_npcs (npc_id);

CREATE TABLE IF NOT EXISTS plot_thread_factions (
    plot_thread_id TEXT    NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    faction_id     TEXT    NOT NULL REFERENCES factions(id)     ON DELETE CASCADE,
    is_key_actor   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (plot_thread_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_plot_thread_factions_faction ON plot_thread_factions (faction_id);

CREATE TABLE IF NOT EXISTS plot_thread_locations (
    plot_thread_id TEXT  NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    location_id    TEXT  NOT NULL REFERENCES locations(id)    ON DELETE CASCADE,
    PRIMARY KEY (plot_thread_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_plot_thread_locations_location ON plot_thread_locations (location_id);

-- ── 005 Sessions ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
    id                   TEXT     PRIMARY KEY,
    campaign_id          TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name                 TEXT     NOT NULL,
    description          TEXT     NOT NULL DEFAULT '',
    session_number       INTEGER  NOT NULL DEFAULT 0,
    status               TEXT     NOT NULL DEFAULT 'planned'
                             CHECK (status IN ('planned','in_progress','completed','cancelled')),
    scheduled_at         TEXT,
    started_at           TEXT,
    ended_at             TEXT,
    duration_minutes     INTEGER,
    campaign_date_start  TEXT,
    campaign_date_end    TEXT,
    rewards              TEXT,
    follow_up_hooks      TEXT,
    tags                 TEXT     NOT NULL DEFAULT '[]',
    created_at           TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at           TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status   ON sessions (status);
CREATE INDEX IF NOT EXISTS idx_sessions_number   ON sessions (campaign_id, session_number);

CREATE TABLE IF NOT EXISTS session_notes (
    id          TEXT    PRIMARY KEY,
    session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    phase       TEXT    NOT NULL DEFAULT 'planning'
                    CHECK (phase IN ('planning','live','recap')),
    content     TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes (session_id);

CREATE TABLE IF NOT EXISTS session_prep_items (
    id          TEXT     PRIMARY KEY,
    session_id  TEXT     NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    description TEXT     NOT NULL DEFAULT '',
    done        INTEGER  NOT NULL DEFAULT 0,
    sort_order  INTEGER  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_prep_session ON session_prep_items (session_id);

CREATE TABLE IF NOT EXISTS session_scenes (
    id          TEXT     PRIMARY KEY,
    session_id  TEXT     NOT NULL REFERENCES sessions(id)  ON DELETE CASCADE,
    title       TEXT     NOT NULL DEFAULT '',
    content     TEXT     NOT NULL DEFAULT '',
    sort_order  INTEGER  NOT NULL DEFAULT 0,
    location_id TEXT     REFERENCES locations(id) ON DELETE SET NULL,
    played      INTEGER  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_scenes_session  ON session_scenes (session_id);
CREATE INDEX IF NOT EXISTS idx_session_scenes_location ON session_scenes (location_id);

CREATE TABLE IF NOT EXISTS session_scene_npcs (
    scene_id  TEXT  NOT NULL REFERENCES session_scenes(id) ON DELETE CASCADE,
    npc_id    TEXT  NOT NULL REFERENCES npcs(id)           ON DELETE CASCADE,
    PRIMARY KEY (scene_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_scene_npcs_npc ON session_scene_npcs (npc_id);

CREATE TABLE IF NOT EXISTS session_quests (
    session_id TEXT  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    quest_id   TEXT  NOT NULL REFERENCES quests(id)   ON DELETE CASCADE,
    outcome    TEXT  NOT NULL DEFAULT 'advanced'
                   CHECK (outcome IN ('advanced','completed')),
    PRIMARY KEY (session_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_session_quests_quest ON session_quests (quest_id);

CREATE TABLE IF NOT EXISTS session_npcs (
    session_id TEXT  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    npc_id     TEXT  NOT NULL REFERENCES npcs(id)     ON DELETE CASCADE,
    PRIMARY KEY (session_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_session_npcs_npc ON session_npcs (npc_id);

CREATE TABLE IF NOT EXISTS session_locations (
    session_id  TEXT  NOT NULL REFERENCES sessions(id)  ON DELETE CASCADE,
    location_id TEXT  NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_session_locations_location ON session_locations (location_id);

CREATE TABLE IF NOT EXISTS session_plot_threads (
    session_id     TEXT  NOT NULL REFERENCES sessions(id)     ON DELETE CASCADE,
    plot_thread_id TEXT  NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, plot_thread_id)
);

CREATE INDEX IF NOT EXISTS idx_session_plot_threads_thread ON session_plot_threads (plot_thread_id);

-- ── 006 Campaign Events ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_events (
    id               TEXT     PRIMARY KEY,
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
    campaign_date    TEXT,
    campaign_date_end TEXT,
    certainty        TEXT     NOT NULL DEFAULT 'exact'
                         CHECK (certainty IN ('exact','approximate','unknown','legendary')),
    is_player_facing INTEGER  NOT NULL DEFAULT 1,
    location_id      TEXT     REFERENCES locations(id)    ON DELETE SET NULL,
    quest_id         TEXT     REFERENCES quests(id)       ON DELETE SET NULL,
    plot_thread_id   TEXT     REFERENCES plot_threads(id) ON DELETE SET NULL,
    session_id       TEXT     REFERENCES sessions(id)     ON DELETE SET NULL,
    tags             TEXT     NOT NULL DEFAULT '[]',
    created_at       TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign    ON campaign_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type        ON campaign_events (event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_significance ON campaign_events (significance);
CREATE INDEX IF NOT EXISTS idx_campaign_events_session     ON campaign_events (session_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_plot_thread ON campaign_events (plot_thread_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_location    ON campaign_events (location_id);

CREATE TABLE IF NOT EXISTS event_causality (
    cause_event_id  TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    effect_event_id TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    PRIMARY KEY (cause_event_id, effect_event_id),
    CHECK (cause_event_id != effect_event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_causality_effect ON event_causality (effect_event_id);

CREATE TABLE IF NOT EXISTS campaign_event_npcs (
    event_id   TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    npc_id     TEXT  NOT NULL REFERENCES npcs(id)            ON DELETE CASCADE,
    role_label TEXT,
    PRIMARY KEY (event_id, npc_id)
);

CREATE INDEX IF NOT EXISTS idx_event_npcs_npc ON campaign_event_npcs (npc_id);

CREATE TABLE IF NOT EXISTS campaign_event_factions (
    event_id   TEXT  NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
    faction_id TEXT  NOT NULL REFERENCES factions(id)        ON DELETE CASCADE,
    PRIMARY KEY (event_id, faction_id)
);

CREATE INDEX IF NOT EXISTS idx_event_factions_faction ON campaign_event_factions (faction_id);

-- ── 008 Entity Relationships & Entity Notes ───────────────────────────────────

CREATE TABLE IF NOT EXISTS entity_relationships (
    id                TEXT     PRIMARY KEY,
    campaign_id       TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    source_id         TEXT     NOT NULL,
    source_type       TEXT     NOT NULL
                          CHECK (source_type IN (
                              'npc','faction','location','quest','session',
                              'event','plot_thread','asset','map'
                          )),
    target_id         TEXT     NOT NULL,
    target_type       TEXT     NOT NULL
                          CHECK (target_type IN (
                              'npc','faction','location','quest','session',
                              'event','plot_thread','asset','map'
                          )),
    relationship_type TEXT     NOT NULL DEFAULT 'custom'
                          CHECK (relationship_type IN (
                              'disposition','membership','leadership',
                              'location_link','quest_link','plot_link',
                              'causality','asset_link','session_link','custom'
                          )),
    label             TEXT     NOT NULL DEFAULT '',
    strength          INTEGER  CHECK (strength IS NULL OR (strength >= -100 AND strength <= 100)),
    directed          INTEGER  NOT NULL DEFAULT 0,
    note              TEXT,
    created_at        TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at        TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (campaign_id, source_id, source_type, target_id, target_type, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_entity_rel_source
    ON entity_relationships (campaign_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_entity_rel_target
    ON entity_relationships (campaign_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_entity_rel_type
    ON entity_relationships (campaign_id, relationship_type);

CREATE TABLE IF NOT EXISTS entity_notes (
    id            TEXT    PRIMARY KEY,
    campaign_id   TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    entity_id     TEXT    NOT NULL,
    entity_type   TEXT    NOT NULL
                      CHECK (entity_type IN (
                          'npc','faction','location','quest','session',
                          'event','plot_thread','asset','map'
                      )),
    content       TEXT    NOT NULL DEFAULT '',
    campaign_date TEXT,
    session_id    TEXT    REFERENCES sessions(id) ON DELETE SET NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_entity_notes_owner
    ON entity_notes (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_notes_campaign
    ON entity_notes (campaign_id);

CREATE INDEX IF NOT EXISTS idx_entity_notes_session
    ON entity_notes (session_id);

-- ── 009 Triggers ──────────────────────────────────────────────────────────────

CREATE TRIGGER IF NOT EXISTS trg_campaigns_updated_at
AFTER UPDATE ON campaigns FOR EACH ROW
BEGIN
    UPDATE campaigns SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_npcs_updated_at
AFTER UPDATE ON npcs FOR EACH ROW
BEGIN
    UPDATE npcs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_factions_updated_at
AFTER UPDATE ON factions FOR EACH ROW
BEGIN
    UPDATE factions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_locations_updated_at
AFTER UPDATE ON locations FOR EACH ROW
BEGIN
    UPDATE locations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_maps_updated_at
AFTER UPDATE ON maps FOR EACH ROW
BEGIN
    UPDATE maps SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_plot_threads_updated_at
AFTER UPDATE ON plot_threads FOR EACH ROW
BEGIN
    UPDATE plot_threads SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_quests_updated_at
AFTER UPDATE ON quests FOR EACH ROW
BEGIN
    UPDATE quests SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_sessions_updated_at
AFTER UPDATE ON sessions FOR EACH ROW
BEGIN
    UPDATE sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_session_notes_updated_at
AFTER UPDATE ON session_notes FOR EACH ROW
BEGIN
    UPDATE session_notes SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_campaign_events_updated_at
AFTER UPDATE ON campaign_events FOR EACH ROW
BEGIN
    UPDATE campaign_events SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_assets_updated_at
AFTER UPDATE ON assets FOR EACH ROW
BEGIN
    UPDATE assets SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_entity_relationships_updated_at
AFTER UPDATE ON entity_relationships FOR EACH ROW
BEGIN
    UPDATE entity_relationships SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_entity_notes_updated_at
AFTER UPDATE ON entity_notes FOR EACH ROW
BEGIN
    UPDATE entity_notes SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
END;
