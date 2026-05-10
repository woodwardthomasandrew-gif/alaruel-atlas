# modules/inspiration

IPC-backed inspiration generator utility.

## Responsibility

- Provides offline random-table inspiration generation
- Lists image assets for inspiration views
- Does not own a database schema

## Key Files

- `index.ts`
- `InspirationGenerator.ts`

## Notes

- This package is loaded by the desktop IPC layer, not by the module loader.
- Text categories currently include plot, npc, location, encounter, item, and name.
