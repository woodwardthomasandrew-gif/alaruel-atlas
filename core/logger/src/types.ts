// ─────────────────────────────────────────────────────────────────────────────
// core/logger — types
// ─────────────────────────────────────────────────────────────────────────────

/** Severity levels in ascending order of importance. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Numeric weight for each level — used for filtering. */
export const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

/** A single structured log record written to output. */
export interface LogEntry {
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Severity. */
  level: LogLevel;
  /** Module or system that produced this entry. */
  source: string;
  /** Human-readable message. */
  message: string;
  /** Arbitrary structured context attached to the entry. */
  context?: Record<string, unknown>;
}

/** Options accepted by createLogger(). */
export interface LoggerOptions {
  /**
   * Minimum level to output. Entries below this level are silently dropped.
   * @default 'debug' in development, 'info' in production
   */
  minLevel?: LogLevel;
  /**
   * Custom sink functions that receive every LogEntry that passes the level
   * filter. Useful for tests or alternative transports (e.g. file writers).
   * If omitted, the default console sink is used.
   */
  sinks?: LogSink[];
}

/** A function that receives a fully formed LogEntry and writes it somewhere. */
export type LogSink = (entry: LogEntry) => void;

/** Public interface of a Logger instance returned by createLogger(). */
export interface Logger {
  /** Fine-grained diagnostic information, suppressed in production. */
  debug(message: string, context?: Record<string, unknown>): void;
  /** Normal operational information. */
  info(message: string, context?: Record<string, unknown>): void;
  /** Something unexpected happened but the operation can continue. */
  warn(message: string, context?: Record<string, unknown>): void;
  /** A failure that needs immediate attention. */
  error(message: string, context?: Record<string, unknown>): void;
  /**
   * Return a child logger that inherits the parent's config but prefixes its
   * source tag: parent source "quests" + child "repo" → "quests:repo".
   */
  child(subSource: string): Logger;
}
