// =============================================================================
// modules/_framework/src/index.ts
//
// Public API of the module framework.
// Feature modules import everything they need from this one entry point.
//
// Usage:
//   import { BaseModule, BaseRepository, BaseService, moduleLoader } from '../_framework'
// =============================================================================

// ── Types ─────────────────────────────────────────────────────────────────────

export type {
  // Module identity
  ModuleId,
  SemVer,
  ModuleManifest,

  // Lifecycle
  ModuleStatus,
  ModuleContext,
  ModuleInitSummary,

  // Interfaces
  IModule,
  IModuleLoader,
  IModuleRepository,
  IModuleService,
} from './types';

// ── Error classes ─────────────────────────────────────────────────────────────

export {
  ModuleValidationError,
  NotFoundError,
  ModuleNotInitialisedError,
} from './types';

// ── Abstract base classes ─────────────────────────────────────────────────────

export { BaseRepository }               from './repository';
export { BaseService }                  from './service';
export type { EmitFn }                  from './service';
export { BaseModule }                   from './module';

// ── Loader ────────────────────────────────────────────────────────────────────

export { ModuleLoader, moduleLoader }   from './loader';
