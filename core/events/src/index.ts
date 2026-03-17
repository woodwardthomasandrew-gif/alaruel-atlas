// ─────────────────────────────────────────────────────────────────────────────
// core/events — EventBus implementation
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IEventBus,
  EventName,
  EventPayload,
  EventHandler,
  SubscriptionToken,
} from './types';
import type { AppEventMap } from './registry';
import { createLogger } from '../../logger/src/index';

export type { IEventBus, EventName, EventPayload, EventHandler, SubscriptionToken };
export type { AppEventMap };
export { AppEventMap as EventRegistry } from './registry';

// ── Internal subscription record ─────────────────────────────────────────────

interface Subscription<K extends EventName> {
  event:   K;
  token:   SubscriptionToken;
  handler: EventHandler<K>;
  once:    boolean;
}

// ── EventBus ─────────────────────────────────────────────────────────────────

/**
 * Typed publish/subscribe event bus.
 *
 * All cross-module communication in Alaruel Atlas flows through this bus.
 * Event names and payload shapes are declared in registry.ts — the central
 * contract document for the whole application.
 *
 * This class is a singleton: import and use `eventBus` directly.
 *
 * @example
 * ```ts
 * // Publisher (quests module)
 * eventBus.emit('quest:completed', { questId: 'q1', npcIds: ['n1'] });
 *
 * // Subscriber (timeline module — does NOT import quests)
 * const token = eventBus.subscribe('quest:completed', ({ questId }) => {
 *   timelineRepo.addEntry({ type: 'quest-completed', refId: questId });
 * });
 *
 * // Teardown
 * eventBus.unsubscribe(token);
 * ```
 */
export class EventBus implements IEventBus {
  /**
   * Map from event name → array of active subscriptions.
   * Using `unknown` internally and casting at call sites for type safety.
   */
  private readonly listeners = new Map<EventName, Subscription<EventName>[]>();

  /** Reverse index: token → event name, for O(1) unsubscribe. */
  private readonly tokenIndex = new Map<SubscriptionToken, EventName>();

  private readonly log = createLogger('core:events');

  // ── emit ───────────────────────────────────────────────────────────────────

  /**
   * Synchronously dispatch an event to all registered handlers.
   *
   * Handlers are invoked in the order they were subscribed.
   * A handler that throws will not prevent subsequent handlers from running —
   * the error is caught, logged, and execution continues.
   *
   * @param event   - Must be a key of AppEventMap.
   * @param payload - Typed payload matching AppEventMap[event].
   */
  emit<K extends EventName>(event: K, payload: EventPayload<K>): void {
    const subs = this.listeners.get(event);
    if (!subs || subs.length === 0) {
      this.log.debug(`emit "${event}" — no listeners`, { event });
      return;
    }

    this.log.debug(`emit "${event}"`, { event, listenerCount: subs.length });

    // Snapshot the array so that a handler that unsubscribes mid-loop doesn't
    // mutate the list we're iterating.
    const snapshot = [...subs];
    const onceCandidates: SubscriptionToken[] = [];

    for (const sub of snapshot) {
      try {
        (sub.handler as EventHandler<K>)(payload);
      } catch (err) {
        this.log.error(`Handler threw for event "${event}"`, {
          event,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      if (sub.once) onceCandidates.push(sub.token);
    }

    // Remove once-handlers after the full iteration.
    for (const token of onceCandidates) {
      this.unsubscribe(token);
    }
  }

  // ── subscribe ──────────────────────────────────────────────────────────────

  /**
   * Register a persistent handler for an event.
   *
   * @returns An opaque SubscriptionToken — store it to unsubscribe later.
   */
  subscribe<K extends EventName>(event: K, handler: EventHandler<K>): SubscriptionToken {
    return this.addSubscription(event, handler, false);
  }

  // ── unsubscribe ────────────────────────────────────────────────────────────

  /**
   * Remove a handler by its token.
   * Silently does nothing if the token is unknown or already removed.
   */
  unsubscribe(token: SubscriptionToken): void {
    const event = this.tokenIndex.get(token);
    if (event === undefined) return;

    const subs = this.listeners.get(event);
    if (subs) {
      const idx = subs.findIndex(s => s.token === token);
      if (idx !== -1) subs.splice(idx, 1);
      if (subs.length === 0) this.listeners.delete(event);
    }
    this.tokenIndex.delete(token);
  }

  // ── once ───────────────────────────────────────────────────────────────────

  /**
   * Subscribe to an event for exactly one emission.
   * The handler is automatically unsubscribed after the first call.
   */
  once<K extends EventName>(event: K, handler: EventHandler<K>): SubscriptionToken {
    return this.addSubscription(event, handler, true);
  }

  // ── clear ──────────────────────────────────────────────────────────────────

  /**
   * Remove all subscriptions for a specific event, or all subscriptions
   * when called without arguments.
   *
   * @param event - If omitted, clears every event.
   */
  clear(event?: EventName): void {
    if (event !== undefined) {
      const subs = this.listeners.get(event) ?? [];
      for (const sub of subs) this.tokenIndex.delete(sub.token);
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
      this.tokenIndex.clear();
    }
  }

  // ── listenerCount ──────────────────────────────────────────────────────────

  /** Return the number of active subscribers for a given event. */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private addSubscription<K extends EventName>(
    event:   K,
    handler: EventHandler<K>,
    once:    boolean,
  ): SubscriptionToken {
    const token: SubscriptionToken = Symbol(event as string);

    const sub: Subscription<K> = { event, token, handler, once };

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    // Cast: the map stores Subscription<EventName>[] but we always push the
    // correctly typed sub — safe because the key and handler type are paired.
    (this.listeners.get(event) as unknown as Subscription<K>[]).push(sub);
    this.tokenIndex.set(token, event);

    this.log.debug(`subscribed to "${event}"`, { event, once });
    return token;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-wide event bus singleton.
 * Import this directly in any module — do not create additional instances.
 */
export const eventBus = new EventBus();
