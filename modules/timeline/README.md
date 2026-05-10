# modules/timeline

Campaign chronology and auto-generated timeline entries.

## Responsibility

- Owns the `campaign_events`, `campaign_event_npcs`, and `event_causality` tables
- Subscribes to quest and session lifecycle events
- Emits `timeline:entry-added`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/events.ts`
- `src/index.ts`

## Notes

- This module is a projection layer; it does not own the authoritative quest or session data.
- `quest:failed` is currently consumed here even though it is not yet declared in the shared event registry.
