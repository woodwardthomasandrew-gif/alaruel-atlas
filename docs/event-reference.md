# Event Reference

All app events are defined in `core/events/src/registry.ts`.

## Naming convention
`<module>:<verb>` — e.g. `quest:completed`, `npc:created`

## Events

### Quest events
| Event              | Payload                       | Emitted by     |
|--------------------|-------------------------------|----------------|
| `quest:created`    | `{ questId }`                 | quests module  |
| `quest:updated`    | `{ questId }`                 | quests module  |
| `quest:completed`  | `{ questId, npcIds }`         | quests module  |

### NPC events
| Event           | Payload      | Emitted by  |
|-----------------|--------------|-------------|
| `npc:created`   | `{ npcId }`  | npcs module |
| `npc:updated`   | `{ npcId }`  | npcs module |

### Session events
| Event              | Payload          | Emitted by      |
|--------------------|------------------|-----------------|
| `session:started`  | `{ sessionId }`  | sessions module |
| `session:ended`    | `{ sessionId }`  | sessions module |

### App lifecycle events
| Event                    | Payload            | Emitted by  |
|--------------------------|--------------------|-------------|
| `app:campaign-opened`    | `{ campaignId }`   | desktop     |
| `app:campaign-closed`    | `{ campaignId }`   | desktop     |

_(Add to this reference as new events are defined in registry.ts)_
