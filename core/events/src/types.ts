// ─────────────────────────────────────────────────────────────────────────────
// core/events — types
// ─────────────────────────────────────────────────────────────────────────────

import type { AppEventMap } from './registry';

/**
 * All valid event names — keys of AppEventMap.
 * Extend AppEventMap in registry.ts to add new events.
 */
export type EventName = keyof AppEventMap;

/**
 * The payload type for a given event name.
 * Resolved automatically from AppEventMap.
 */
export type EventPayload<K extends EventName> = AppEventMap[K];

/**
 * A handler function for a specific event.
 * Receives the fully typed payload for that event.
 */
export type EventHandler<K extends EventName> = (payload: EventPayload<K>) => void;

/**
 * An opaque token returned by subscribe().
 * Pass it to unsubscribe() to remove the handler.
 */
export type SubscriptionToken = symbol;

/** Public interface of the EventBus singleton. */
export interface IEventBus {
  /**
   * Publish an event to all current subscribers.
   * Handlers are called synchronously in subscription order.
   *
   * @param event   - The event name (must be in AppEventMap).
   * @param payload - The data to deliver to subscribers.
   */
  emit<K extends EventName>(event: K, payload: EventPayload<K>): void;

  /**
   * Register a handler for an event.
   *
   * @param event   - The event name to listen for.
   * @param handler - Called every time the event is emitted.
   * @returns A SubscriptionToken — keep it to unsubscribe later.
   */
  subscribe<K extends EventName>(event: K, handler: EventHandler<K>): SubscriptionToken;

  /**
   * Remove a previously registered handler using its token.
   *
   * @param token - The value returned by subscribe().
   */
  unsubscribe(token: SubscriptionToken): void;

  /**
   * Register a handler that fires at most once, then auto-unsubscribes.
   *
   * @param event   - The event name to listen for.
   * @param handler - Called on the next emission only.
   * @returns A SubscriptionToken (can still be used to cancel early).
   */
  once<K extends EventName>(event: K, handler: EventHandler<K>): SubscriptionToken;

  /**
   * Remove all subscriptions for a specific event, or all subscriptions
   * across all events if no argument is provided.
   * Primarily useful in tests.
   */
  clear(event?: EventName): void;

  /**
   * Return the number of active subscribers for a given event.
   * Useful for debugging and tests.
   */
  listenerCount(event: EventName): number;
}
