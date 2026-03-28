-- Session export verification dataset
-- Requires an existing campaign row with id: camp_example

INSERT OR IGNORE INTO sessions
  (id, campaign_id, name, description, session_number, status, scheduled_at, tags, created_at, updated_at)
VALUES
  ('ses_export_01', 'camp_example', 'The Shattered Bell', 'Test session for print/export layout.', 21, 'planned', '2026-03-28T19:00:00Z', '["export","test"]', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO npcs
  (id, campaign_id, name, alias, role, vital_status, disposition_towards_players, description, tags, created_at, updated_at)
VALUES
  ('npc_foreman', 'camp_example', 'Jorek Vale', 'The Foreman', 'ally', 'alive', 'friendly', 'Mine foreman with missing crew records.', '[]', datetime('now'), datetime('now')),
  ('npc_smuggler', 'camp_example', 'Mara Quill', NULL, 'informant', 'alive', 'neutral', 'Smuggler with hidden routes.', '[]', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO monsters
  (id, campaign_id, name, creature_type, size, challenge_rating, is_homebrew, tags, created_at, updated_at)
VALUES
  ('mon_ghoul', 'camp_example', 'Ghoul', 'undead', 'medium', '1', 0, '[]', datetime('now'), datetime('now')),
  ('mon_ogre', 'camp_example', 'Ogre Brute', 'giant', 'large', '2', 1, '[]', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO minis
  (id, campaign_id, name, description, base_size, quantity, tags, created_at, updated_at)
VALUES
  ('mini_ghoul', 'camp_example', 'Ghoul Mini', 'Grey resin with broken jaw sculpt.', 'medium', 6, '[]', datetime('now'), datetime('now')),
  ('mini_ogre', 'camp_example', 'Ogre Mini', 'Large stone base, chipped paint.', 'large', 2, '[]', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO session_scenes
  (id, session_id, title, content, sort_order, played)
VALUES
  ('scn_export_01', 'ses_export_01', 'Collapsed Entry', '{"type":"exploration","objective":"Secure an entry route","setup":"Broken supports, toxic dust pockets.","reward":"Shortcut into the lower shaft."}', 0, 0),
  ('scn_export_02', 'ses_export_01', 'The Pump Hall Ambush', '{"type":"combat","objective":"Survive the ambush","setup":"Ghouls emerge from flooded channels.","reward":"Recover the foreman''s ledger."}', 1, 0),
  ('scn_export_03', 'ses_export_01', 'Smuggler''s Bargain', '{"type":"social","objective":"Negotiate map access","setup":"Mara offers routes in exchange for protection.","reward":"Route to hidden chapel."}', 2, 0);

INSERT OR IGNORE INTO session_scene_npcs (scene_id, npc_id) VALUES
  ('scn_export_01', 'npc_foreman'),
  ('scn_export_03', 'npc_smuggler');

INSERT OR IGNORE INTO session_scene_monsters (scene_id, monster_id, count, notes) VALUES
  ('scn_export_02', 'mon_ghoul', 3, 'Two flank from catwalk, one hides by pump wheel.'),
  ('scn_export_02', 'mon_ogre', 1, 'Arrives at round three from east tunnel.');

INSERT OR IGNORE INTO session_scene_minis (scene_id, mini_id, count) VALUES
  ('scn_export_02', 'mini_ghoul', 3),
  ('scn_export_02', 'mini_ogre', 1),
  ('scn_export_03', 'mini_ghoul', 1);

INSERT OR IGNORE INTO session_npcs (session_id, npc_id) VALUES
  ('ses_export_01', 'npc_foreman'),
  ('ses_export_01', 'npc_smuggler');

INSERT OR IGNORE INTO session_prep_items (id, session_id, description, done, sort_order) VALUES
  ('prep_export_01', 'ses_export_01', 'Print mine handout', 1, 0),
  ('prep_export_02', 'ses_export_01', 'Prepare ghoul tactics card', 0, 1);

INSERT OR IGNORE INTO session_notes (id, session_id, phase, content, created_at, updated_at) VALUES
  ('note_export_01', 'ses_export_01', 'planning', 'Foreshadow bell toll in scene one.', datetime('now'), datetime('now')),
  ('note_export_02', 'ses_export_01', 'live', 'Players rescued a trapped worker early.', datetime('now'), datetime('now')),
  ('note_export_03', 'ses_export_01', 'recap', 'Mara now owes the party a favor.', datetime('now'), datetime('now'));
