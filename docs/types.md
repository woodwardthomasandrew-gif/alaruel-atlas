# TypeScript Types and Interfaces

This reference focuses on the canonical data contracts used across modules (`shared/src/types/*`, `modules/*/src/types.ts`, `ui/src/types/*`, `core/*/src/types.ts`).

For a raw declaration inventory across repo TS files, see `types-index.md`.

## Session Model (Requested)

### `Session` (`shared/src/types/session.ts`, `ui/src/types/session.ts`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Session identifier. |
| `name` | `string` | Yes | Session title. |
| `description` | `string` | Yes | GM summary/planning text. |
| `sessionNumber` | `number` | Yes | Chronological campaign session order. |
| `status` | `'planned' | 'in_progress' | 'completed' | 'cancelled'` | Yes | Session lifecycle state. |
| `scheduledAt` | `string` | No | Planned real-world datetime. |
| `startedAt` | `string` | No | Actual start datetime. |
| `endedAt` | `string` | No | Actual end datetime. |
| `durationMinutes` | `number` | No | Actual duration. |
| `campaignDateStart` | `string` | No | In-world date start. |
| `campaignDateEnd` | `string` | No | In-world date end. |
| `rewards` | `string` | No | Rewards gained in session. |
| `followUpHooks` | `string` | No | GM follow-up hooks. |
| `scenes` | `SessionScene[]` | Yes | Ordered scene/encounter units. |
| `prepItems` | `SessionPrepItem[]` | Yes | Prep checklist. |
| `notes` | `SessionNote[]` | Yes | Planning/live/recap notes. |
| `advancedQuestIds` | `string[]` | Yes | Quests advanced this session. |
| `completedQuestIds` | `string[]` | Yes | Quests completed this session. |
| `plotThreadIds` | `string[]` | Yes | Plot threads touched. |
| `featuredNpcIds` | `string[]` | Yes | NPCs featured. |
| `visitedLocationIds` | `string[]` | Yes | Locations visited. |
| `eventIds` | `string[]` | Yes | Timeline event IDs created/linked. |
| `assetIds` | `string[]` | Yes | Linked assets. |
| `tags` | `string[]` | Yes | Filter tags. |
| `createdAt` | `string` | Yes | Creation timestamp. |
| `updatedAt` | `string` | Yes | Last modification timestamp. |

### `SessionScene`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Scene ID. |
| `title` | `string` | Yes | Scene title. |
| `content` | `string` | Yes | Scene details/GM text. |
| `order` | `number` | Yes | Scene sort order. |
| `locationId` | `string \| null` | Yes | Linked location. |
| `npcIds` | `string[]` | Yes | NPCs in scene. |
| `monsters` | `SceneMonsterEntry[]` | Yes | Monster encounter entries. |
| `minis` | `SceneMiniEntry[]` | Yes | Mini encounter entries. |
| `played` | `boolean` | Yes | Played state. |

### `SessionNote`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Note ID. |
| `phase` | `'planning' \| 'live' \| 'recap'` | Yes | Session phase for note. |
| `content` | `string` | Yes | Note body. |
| `createdAt` | `string` | Yes | Creation timestamp. |
| `updatedAt` | `string` | Yes | Last edit timestamp. |

### `SceneMonsterEntry`

| Field | Type | Required | Description |
|---|---|---|---|
| `monsterId` | `string` | Yes | Monster reference. |
| `count` | `number` | Yes | Quantity in scene. |
| `notes` | `string` | No | Encounter notes/tactics. |

### `SceneMiniEntry`

| Field | Type | Required | Description |
|---|---|---|---|
| `miniId` | `string` | Yes | Mini reference. |
| `count` | `number` | Yes | Quantity needed/used. |

## Quest Model (Requested)

### `Quest` (`shared/src/types/quest.ts`, `ui/src/types/quest.ts`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id`,`name`,`description`,`tags`,`createdAt`,`updatedAt` | base fields | Yes | Core identity and metadata. |
| `status` | `QuestStatus` | Yes | Rumour/active/completed/etc. |
| `questType` | `QuestType` | Yes | Main/side/faction/etc. |
| `priority` | `number` | Yes | Sorting/importance weight. |
| `objectives` | `QuestObjective[]` | Yes | Ordered objective list. |
| `startDate`,`endDate` | `string` | No | In-world temporal bounds. |
| `questGiverNpcId` | `string \| null` | Yes | Primary quest giver NPC. |
| `involvedNpcIds` | `string[]` | Yes | Related NPCs. |
| `sponsorFactionId` | `string \| null` | Yes | Sponsoring faction. |
| `locationIds` | `string[]` | Yes | Linked locations. |
| `plotThreadId` | `string \| null` | Yes | Owning plot thread. |
| `prerequisiteQuestIds` | `string[]` | Yes | Required precursor quests. |
| `unlocksQuestIds` | `string[]` | Yes | Quests unlocked by completion. |
| `sessionIds` | `string[]` | Yes | Sessions where quest progressed. |
| `notes` | `QuestNote[]` | Yes | Private/public notes. |
| `reward` | `string` | No | Reward text. |

### `QuestObjective`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Objective ID. |
| `description` | `string` | Yes | Objective text. |
| `completed` | `boolean` | Yes | Completion state. |
| `required` | `boolean` | Yes | Mandatory vs optional. |
| `deadline` | `CampaignDate` | No | In-world deadline. |

## Examples

```ts
const exampleSession: Session = {
  id: 'ses_01',
  name: 'Into the Crystal Mines',
  description: 'Recover survey logs and survive ambushes.',
  sessionNumber: 12,
  status: 'planned',
  scenes: [{
    id: 'scn_01',
    title: 'Collapsed Entry',
    content: 'Scouts and unstable supports.',
    order: 0,
    locationId: 'loc_cahill_mine',
    npcIds: ['npc_foreman'],
    monsters: [{ monsterId: 'mon_ghoul', count: 3 }],
    minis: [{ miniId: 'mini_ghoul', count: 3 }],
    played: false
  }],
  prepItems: [{ id: 'prep_01', description: 'Print statblocks', done: false }],
  notes: [{ id: 'note_01', phase: 'planning', content: 'Foreshadow idol marks.', createdAt: '2026-03-25T10:00:00Z', updatedAt: '2026-03-25T10:00:00Z' }],
  advancedQuestIds: ['qst_amber_01'],
  completedQuestIds: [],
  plotThreadIds: ['plot_amber_cult'],
  featuredNpcIds: ['npc_foreman'],
  visitedLocationIds: ['loc_cahill_mine'],
  eventIds: [],
  assetIds: [],
  tags: ['mine', 'undead'],
  createdAt: '2026-03-25T10:00:00Z',
  updatedAt: '2026-03-25T10:00:00Z'
};
```

```ts
const exampleQuest: Quest = {
  id: 'qst_amber_01',
  name: 'Shards in the Deep',
  description: 'Investigate corruption under the cathedral annex.',
  status: 'active',
  questType: 'main',
  priority: 10,
  objectives: [{ id: 'obj_1', description: 'Secure entry shaft', completed: false, required: true }],
  questGiverNpcId: 'npc_archivist',
  involvedNpcIds: ['npc_foreman'],
  sponsorFactionId: null,
  locationIds: ['loc_cahill_mine'],
  plotThreadId: 'plot_amber_cult',
  prerequisiteQuestIds: [],
  unlocksQuestIds: [],
  sessionIds: ['ses_01'],
  notes: [],
  tags: ['amber', 'mine'],
  createdAt: '2026-03-25T10:00:00Z',
  updatedAt: '2026-03-25T10:00:00Z'
};
```

## Additional Canonical Type Families

- Shared domain entities: `Campaign`, `CampaignSettings`, `CampaignEvent`, `Location`, `CampaignMap`, `NPC`, `Faction`, `Monster`, `Mini`, `PlotThread`, `GraphNode`, `GraphEdge`, asset/plugin/common utility types.
- Module row/input contracts: all `modules/*/src/types.ts` (`*Row`, `Create*Input`, `Update*Input`, query DTOs).
- Core infrastructure contracts: `IDatabaseManager`, `IEventBus`, `IConfigManager`, `IAssetManager`, `IPluginLoader`, `Logger`, module framework interfaces.
- UI transport contracts: `ui/src/types/*`, `ui/src/bridge/atlas.ts`, `apps/desktop/src/preload.ts` bridge interfaces.

## Complete Declaration Inventory

Generated from repository scan: [`types-index.md`](./types-index.md)
