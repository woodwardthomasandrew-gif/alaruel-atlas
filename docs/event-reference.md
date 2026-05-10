# Event Reference

All app events are defined in `core/events/src/registry.ts`.

## Naming convention

`<module>:<verb>` - e.g. `quest:completed`, `npc:created`

## Events

### Registry events

| Event | Payload | Emitted by |
|---|---|---|
| `quest:created` | `{ questId }` | quests |
| `quest:updated` | `{ questId }` | quests |
| `quest:completed` | `{ questId, npcIds }` | quests |
| `npc:created` | `{ npcId }` | npcs |
| `npc:updated` | `{ npcId }` | npcs |
| `faction:created` | `{ factionId }` | factions |
| `faction:updated` | `{ factionId }` | factions |
| `faction:deleted` | `{ factionId }` | factions |
| `faction:organization_updated` | `{ factionId }` | factions |
| `faction:territory_updated` | `{ factionId }` | factions |
| `faction:relation_updated` | `{ factionId }` | factions |
| `faction:reputation_updated` | `{ factionId }` | factions |
| `session:started` | `{ sessionId }` | sessions |
| `session:ended` | `{ sessionId }` | sessions |
| `timeline:entry-added` | `{ entryId }` | timeline |
| `atlas:map-loaded` | `{ mapId }` | atlas |
| `location:deleted` | `{ locationId }` | atlas / location consumers |
| `plugin:loaded` | `{ pluginId }` | plugins |
| `plugin:unloaded` | `{ pluginId }` | plugins |
| `dungeon:generated` | `{ dungeonId }` | dungeon |
| `bestiary:created` | `{ monsterId }` | bestiary |
| `bestiary:updated` | `{ monsterId }` | bestiary |
| `mini-catalogue:created` | `{ miniId }` | mini-catalogue |
| `mini-catalogue:updated` | `{ miniId }` | mini-catalogue |
| `app:campaign-opened` | `{ campaignId }` | desktop |
| `app:campaign-closed` | `{ campaignId }` | desktop |

### Code-only events currently used outside the registry

| Event | Where it appears |
|---|---|
| `quest:failed` | `modules/timeline/src/module.ts` subscribes to it |
| `session:encounter-updated` | `modules/sessions/src/events.ts` emits it |

### Renderer forwarding

`apps/desktop/src/ipc.ts` forwards the following registry events to the renderer as `push:moduleEvent`:

- `quest:created`
- `quest:updated`
- `quest:completed`
- `npc:created`
- `npc:updated`
- `faction:created`
- `faction:updated`
- `faction:deleted`
- `faction:organization_updated`
- `faction:territory_updated`
- `faction:relation_updated`
- `faction:reputation_updated`
- `session:started`
- `session:ended`
- `timeline:entry-added`
- `atlas:map-loaded`
- `bestiary:created`
- `bestiary:updated`
- `mini-catalogue:created`
- `mini-catalogue:updated`
