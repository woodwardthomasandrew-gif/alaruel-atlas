# Database Guide

## One File per Campaign

Each campaign is stored as a single `.db` file in `data/campaigns/`.

## Schema Registration

Modules register their migrations at boot:

```ts
databaseManager.registerSchema({
  module: 'quests',
  migrations: [
    {
      version: 4,
      module: 'quests',
      description: 'Create quest tables',
      up: 'CREATE TABLE ...'
    }
  ]
})
```

## Table Naming

The runtime currently uses the actual table names created by each module schema. It does not force a single prefix convention.

## Migrations

Migrations are versioned integers. The database manager runs pending migrations on open, in ascending version order.

## Query Patterns

```ts
// Read
const entries = db.query<Quest>('SELECT * FROM quests WHERE campaign_id = ?', [id]);

// Write
db.run('INSERT INTO quests (...) VALUES (...)');
```

## Rules

- No raw SQL outside `core/database`
- All writes go through the database manager
- Schema changes go through migrations
