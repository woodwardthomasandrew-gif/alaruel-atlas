# modules/_framework

Shared module lifecycle infrastructure.

## What lives here

| File | Purpose |
|---|---|
| `src/types.ts` | Module interfaces, manifest types, and error types |
| `src/repository.ts` | `BaseRepository` - abstract DB-access base class |
| `src/service.ts` | `BaseService` - abstract business-logic base class |
| `src/module.ts` | `BaseModule` - abstract lifecycle owner |
| `src/loader.ts` | `ModuleLoader` - registry, dependency sorting, lifecycle orchestration |
| `src/index.ts` | Barrel export for feature modules |

## How to implement a feature module

Every feature module extends the base classes from this package:

```ts
class QuestRepository extends BaseRepository { ... }

class QuestService extends BaseService<QuestRepository> { ... }

class QuestsModule extends BaseModule<QuestRepository, QuestService> {
  readonly manifest = { id: 'quests', displayName: 'Quests', ... };
  protected createRepository(db) { return new QuestRepository(db, log); }
  protected createService(repo) { return new QuestService(repo, log, emit); }
  protected async onInit(ctx) { ctx.registerSchema(...); ctx.subscribe(...); }
}
```

## Module Isolation Rules

- Import from `../../_framework/src/index`
- Import from `../../../core/*`
- Import from `@alaruel/shared`
- Never import from another feature module
- Never import `better-sqlite3` directly
- Never import the global `eventBus` singleton; use `ctx.subscribe` and `ctx.emit`

## Boot Sequence

```ts
ModuleLoader.register(new NpcsModule())
ModuleLoader.register(new QuestsModule()) // dependsOn: ['npcs']
ModuleLoader.register(new SessionsModule()) // dependsOn: ['npcs', 'quests']

await ModuleLoader.initAll()
// Topological sort means npcs boots first, then quests, then sessions.
```
