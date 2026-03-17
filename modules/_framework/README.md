# modules/_framework

The module system infrastructure for Alaruel Atlas.

## What lives here

| File              | Purpose                                                             |
|-------------------|---------------------------------------------------------------------|
| `src/types.ts`    | All interface definitions: `IModule`, `IModuleService`, `IModuleRepository`, `ModuleContext`, `ModuleManifest`, error types |
| `src/repository.ts` | `BaseRepository` — abstract DB-access base class                  |
| `src/service.ts`  | `BaseService` — abstract business-logic base class                  |
| `src/module.ts`   | `BaseModule` — abstract lifecycle owner                             |
| `src/loader.ts`   | `ModuleLoader` — registry, topological sort, lifecycle orchestration |
| `src/index.ts`    | Barrel: re-exports everything feature modules need                  |

## How to implement a feature module

Every feature module extends three classes from this package:

```ts
// repository.ts
class QuestRepository extends BaseRepository { ... }

// service.ts
class QuestService extends BaseService<QuestRepository> { ... }

// module.ts
class QuestsModule extends BaseModule<QuestRepository, QuestService> {
  readonly manifest = { id: 'quests', displayName: 'Quests', ... };
  protected createRepository(db) { return new QuestRepository(db, log); }
  protected createService(repo)  { return new QuestService(repo, log, emit); }
  protected async onInit(ctx)    { ctx.registerSchema(...); ctx.subscribe(...); }
}
```

## Module isolation rules

Enforced by convention and enforced by linting:

- ✅ Import from `../../_framework/src/index.js`
- ✅ Import from `../../../core/*`
- ✅ Import from `@alaruel/shared`
- ❌ Never import from another feature module
- ❌ Never import `better-sqlite3` directly
- ❌ Never import the global `eventBus` singleton — use `ctx.subscribe` / `ctx.emit`

## Boot sequence

```
ModuleLoader.register(new NpcsModule())
ModuleLoader.register(new QuestsModule())   // dependsOn: ['npcs']
ModuleLoader.register(new SessionsModule()) // dependsOn: ['npcs','quests']

await ModuleLoader.initAll()
// Topological sort → npcs boots first, then quests, then sessions
// Each module receives a ModuleContext with scoped logger, subscribe, emit, etc.
```
