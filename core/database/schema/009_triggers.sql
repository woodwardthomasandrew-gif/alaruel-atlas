-- =============================================================================
-- Migration 009 — updated_at Triggers
-- =============================================================================
-- SQLite has no ON UPDATE timestamp mechanism. These triggers fire AFTER any
-- UPDATE on entity tables and set updated_at to the current UTC time.
--
-- One trigger per table that carries an updated_at column.
-- Using AFTER UPDATE keeps the trigger body minimal and avoids recursive fires.
-- =============================================================================

-- campaigns
CREATE TRIGGER IF NOT EXISTS trg_campaigns_updated_at
AFTER UPDATE ON campaigns FOR EACH ROW
BEGIN
    UPDATE campaigns SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- npcs
CREATE TRIGGER IF NOT EXISTS trg_npcs_updated_at
AFTER UPDATE ON npcs FOR EACH ROW
BEGIN
    UPDATE npcs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- factions
CREATE TRIGGER IF NOT EXISTS trg_factions_updated_at
AFTER UPDATE ON factions FOR EACH ROW
BEGIN
    UPDATE factions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- locations
CREATE TRIGGER IF NOT EXISTS trg_locations_updated_at
AFTER UPDATE ON locations FOR EACH ROW
BEGIN
    UPDATE locations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- maps
CREATE TRIGGER IF NOT EXISTS trg_maps_updated_at
AFTER UPDATE ON maps FOR EACH ROW
BEGIN
    UPDATE maps SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- plot_threads
CREATE TRIGGER IF NOT EXISTS trg_plot_threads_updated_at
AFTER UPDATE ON plot_threads FOR EACH ROW
BEGIN
    UPDATE plot_threads SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- quests
CREATE TRIGGER IF NOT EXISTS trg_quests_updated_at
AFTER UPDATE ON quests FOR EACH ROW
BEGIN
    UPDATE quests SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- sessions
CREATE TRIGGER IF NOT EXISTS trg_sessions_updated_at
AFTER UPDATE ON sessions FOR EACH ROW
BEGIN
    UPDATE sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- session_notes
CREATE TRIGGER IF NOT EXISTS trg_session_notes_updated_at
AFTER UPDATE ON session_notes FOR EACH ROW
BEGIN
    UPDATE session_notes SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- campaign_events
CREATE TRIGGER IF NOT EXISTS trg_campaign_events_updated_at
AFTER UPDATE ON campaign_events FOR EACH ROW
BEGIN
    UPDATE campaign_events SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- assets
CREATE TRIGGER IF NOT EXISTS trg_assets_updated_at
AFTER UPDATE ON assets FOR EACH ROW
BEGIN
    UPDATE assets SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- entity_relationships
CREATE TRIGGER IF NOT EXISTS trg_entity_relationships_updated_at
AFTER UPDATE ON entity_relationships FOR EACH ROW
BEGIN
    UPDATE entity_relationships SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;

-- entity_notes
CREATE TRIGGER IF NOT EXISTS trg_entity_notes_updated_at
AFTER UPDATE ON entity_notes FOR EACH ROW
BEGIN
    UPDATE entity_notes SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = NEW.id;
END;
