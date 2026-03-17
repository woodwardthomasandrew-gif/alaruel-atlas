# ui/

React renderer application — the Electron window content.

## Responsibilities
- Application shell (layout, navigation, title bar)
- Module view routing
- Module registry (maps module IDs → view components)
- Global UI state (open campaign, active view, theme)

## Key files
| File                            | Purpose                              |
|---------------------------------|--------------------------------------|
| `src/main.tsx`                  | Renderer entry point                 |
| `src/App.tsx`                   | Root component and providers         |
| `src/router/routes.ts`          | Route definitions                    |
| `src/registry/module-registry.ts` | Module → view mapping              |
| `src/layouts/AppShell.tsx`      | Persistent chrome (sidebar + main)   |
| `src/store/campaign.store.ts`   | Active campaign global state         |

## Rules
- UI never imports module internals — it only imports from module `index.ts`
- New modules add themselves to the registry, not the router directly
