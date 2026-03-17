# Database Guide

## One file per campaign
Each campaign is stored as a single `.db` file in `data/campaigns/`.
Filename: `<campaign-slug>.db`

## Schema registration
Modules register their tables at boot:
```ts
databaseManager.registerSchema({
  module: 'quests',
  version: 1,
  tables: [ /* CreateTableStatement[] */ ]
})
```

## Table naming convention
All tables are prefixed with their module name: `quests_entries`, `npcs_characters`, etc.

## Migrations
Migrations are versioned integers. The database manager runs pending migrations
on open, in ascending version order.

## Query patterns
```ts
// Read
const entries = db.query<QuestEntry>('SELECT * FROM quests_entries WHERE campaign_id = ?', [id])

// Write (always transactional)
db.run('INSERT INTO quests_entries ...')
```

## Rules
- No raw SQL outside `core/database`
- All writes go through the database manager
- Never run DDL after boot (schema changes go through migrations)
