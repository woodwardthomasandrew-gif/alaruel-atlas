// =============================================================================
// modules/_framework/src/service.ts
//
// BaseService — abstract base class for all module services.
//
// Services are the business-logic layer. They sit between a module's public
// API (exposed in index.ts) and its repository (database access).
//
// Responsibilities of a Service:
//   - Input validation (throw ModuleValidationError on bad data)
//   - Orchestrating multi-step operations (read → decide → write → emit)
//   - Generating entity IDs before repository write
//   - Emitting events after successful mutations
//   - Enforcing domain invariants (e.g. "a completed quest cannot go active")
//
// What a Service must NOT do:
//   - Write SQL (that belongs in the repository)
//   - Import from other modules (use events for cross-module side-effects)
//   - Know about HTTP, IPC, or UI concerns
// =============================================================================

import type { Logger }                       from '../../../core/logger/src/types';
import type { EventName, EventPayload }       from '../../../core/events/src/types';
import type { IModuleService, ModuleId }      from './types';
import type { BaseRepository }                from './repository';
import { ModuleNotInitialisedError,
         ModuleValidationError,
         NotFoundError }                      from './types';

// Re-export error types so feature modules import from the framework only
export { ModuleValidationError, NotFoundError, ModuleNotInitialisedError };

// ── Emit callback type ────────────────────────────────────────────────────────

/**
 * The subset of the EventBus that services are allowed to call.
 * Services receive this via constructor injection — they never import the
 * global eventBus singleton directly.
 */
export type EmitFn = <K extends EventName>(event: K, payload: EventPayload<K>) => void;

// ── BaseService ───────────────────────────────────────────────────────────────

/**
 * Abstract base class for all Alaruel Atlas module services.
 *
 * @example
 * ```ts
 * export class QuestService extends BaseService<QuestRepository> {
 *   async createQuest(input: CreateQuestInput): Promise<Quest> {
 *     this.assertInitialised();
 *
 *     // 1. Validate
 *     this.validate(input.name?.trim().length > 0, 'Quest name is required', 'NAME_REQUIRED', 'name');
 *
 *     // 2. Write via repository
 *     const quest = this.repository.create({ ...input, id: this.generateId() });
 *
 *     // 3. Emit event (cross-module subscribers react without being imported)
 *     this.emit('quest:created', { questId: quest.id });
 *
 *     return quest;
 *   }
 * }
 * ```
 *
 * @typeParam TRepo - The concrete repository type this service depends on.
 */
export abstract class BaseService<TRepo extends BaseRepository> implements IModuleService {
  private _initialised = false;

  constructor(
    /** Module ID for scoped logging. */
    protected readonly moduleId: ModuleId,
    /** The module's repository, injected by the owning BaseModule. */
    protected readonly repository: TRepo,
    /** Pre-scoped logger for this service. */
    protected readonly log: Logger,
    /** Bound emit function from the module context. */
    private readonly _emit: EmitFn,
  ) {}

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Called during the module's init() phase after the repository is ready.
   * Subclasses should override to set up caches or computed state,
   * always calling `super.initialize()` first.
   */
  initialize(): void {
    this._initialised = true;
    this.log.debug('Service initialised');
  }

  // ── Protected helpers ───────────────────────────────────────────────────────

  /**
   * Emit an event onto the application event bus.
   * Wraps the context's emit function with error isolation so a failing
   * subscriber never bubbles back into the service call stack.
   */
  protected emit<K extends EventName>(event: K, payload: EventPayload<K>): void {
    try {
      this._emit(event, payload);
    } catch (err) {
      this.log.error(`emit('${event}') threw — subscriber error isolated`, {
        event,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Generate a new unique entity ID.
   * Uses `crypto.randomUUID()` for UUID v4 compliance.
   * Consistent across the whole codebase — no external nanoid dependency.
   */
  protected generateId(): string {
    return (globalThis.crypto ?? require("node:crypto")).randomUUID();
  }

  /**
   * Assert a validation condition. Throws ModuleValidationError on failure.
   *
   * @param condition - The condition that must be true.
   * @param message   - Human-readable error shown in the UI.
   * @param code      - Machine-readable code for programmatic handling.
   * @param field     - Optional field name that failed (for form error display).
   *
   * @example
   * this.validate(name.length > 0, 'Name is required', 'NAME_REQUIRED', 'name');
   */
  protected validate(
    condition: boolean,
    message:   string,
    code:      string,
    field?:    string,
  ): asserts condition {
    if (!condition) throw new ModuleValidationError(message, code, field);
  }

  /**
   * Validate that a string field is non-empty after trimming.
   * Convenience wrapper around validate() for the most common check.
   */
  protected requireString(value: unknown, fieldName: string): asserts value is string {
    this.validate(
      typeof value === 'string' && value.trim().length > 0,
      `${fieldName} is required and must be a non-empty string.`,
      `${fieldName.toUpperCase().replace(/\s+/g, '_')}_REQUIRED`,
      fieldName,
    );
  }

  /**
   * Validate that a numeric value falls within an inclusive range.
   */
  protected requireRange(
    value:    number,
    min:      number,
    max:      number,
    fieldName: string,
  ): void {
    this.validate(
      value >= min && value <= max,
      `${fieldName} must be between ${min} and ${max}. Got ${value}.`,
      `${fieldName.toUpperCase().replace(/\s+/g, '_')}_OUT_OF_RANGE`,
      fieldName,
    );
  }

  /**
   * Validate that a value is one of a fixed set of allowed values.
   */
  protected requireOneOf<T extends string>(
    value:     unknown,
    allowed:   readonly T[],
    fieldName: string,
  ): asserts value is T {
    this.validate(
      allowed.includes(value as T),
      `${fieldName} must be one of: ${allowed.join(', ')}. Got '${String(value)}'.`,
      `${fieldName.toUpperCase().replace(/\s+/g, '_')}_INVALID`,
      fieldName,
    );
  }

  /**
   * Throw a descriptive error if the service is used before initialize() runs.
   * Call at the top of every public method.
   */
  protected assertInitialised(): void {
    if (!this._initialised) throw new ModuleNotInitialisedError(this.moduleId);
  }

  /**
   * Build a current ISO-8601 UTC timestamp string.
   * Centralised so all entities use an identical format.
   */
  protected now(): string {
    return new Date().toISOString();
  }
}
