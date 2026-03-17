// ─────────────────────────────────────────────────────────────────────────────
// core/logger — implementation
// ─────────────────────────────────────────────────────────────────────────────

import type { Logger, LogEntry, LoggerOptions, LogSink, LogLevel } from './types';
import { LOG_LEVEL_WEIGHT } from './types';

export type { Logger, LogEntry, LoggerOptions, LogSink, LogLevel };
export { LOG_LEVEL_WEIGHT };

// ── Default console sink ──────────────────────────────────────────────────────

const LEVEL_COLOURS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info:  '\x1b[32m', // green
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

/**
 * Default sink: writes a colour-coded, human-readable line to stdout/stderr.
 * In production you can replace this with a file-rotating JSON sink.
 */
const consoleSink: LogSink = (entry: LogEntry): void => {
  const colour = LEVEL_COLOURS[entry.level];
  const level  = entry.level.toUpperCase().padEnd(5);
  const line   = `${colour}[${level}]${RESET} ${entry.timestamp} [${entry.source}] ${entry.message}`;
  const output = entry.level === 'error' ? console.error : console.log;
  if (entry.context && Object.keys(entry.context).length > 0) {
    output(line, entry.context);
  } else {
    output(line);
  }
};

// ── LoggerImpl ────────────────────────────────────────────────────────────────

/**
 * Concrete implementation of the Logger interface.
 * Constructed via createLogger() — never instantiated directly.
 */
class LoggerImpl implements Logger {
  private readonly source: string;
  private readonly minLevelWeight: number;
  private readonly sinks: readonly LogSink[];

  constructor(source: string, options: Required<LoggerOptions>) {
    this.source        = source;
    this.minLevelWeight = LOG_LEVEL_WEIGHT[options.minLevel];
    this.sinks         = options.sinks;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context);
  }

  /**
   * Create a child logger whose source tag is `parentSource:subSource`.
   * The child inherits the parent's min-level and sinks.
   */
  child(subSource: string): Logger {
    return new LoggerImpl(`${this.source}:${subSource}`, {
      minLevel: levelFromWeight(this.minLevelWeight),
      sinks:    [...this.sinks],
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_WEIGHT[level] < this.minLevelWeight) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source:  this.source,
      message,
      ...(context !== undefined ? { context } : {}),
    };

    for (const sink of this.sinks) {
      try {
        sink(entry);
      } catch {
        // Never let a broken sink crash the application.
      }
    }
  }
}

// ── Module-level shared state ─────────────────────────────────────────────────

/** Global minimum log level, set once via configureLogger(). */
let globalMinLevel: LogLevel =
  (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'production')
    ? 'info'
    : 'debug';

/** Global sinks list, starts with the console sink. */
const globalSinks: LogSink[] = [consoleSink];

// ── Public factory functions ──────────────────────────────────────────────────

/**
 * Create a named logger for a module or system.
 *
 * @param source - A short identifier for the caller, e.g. `'quests'` or
 *                 `'core:database'`. Appears in every log line.
 * @param options - Optional overrides for min level and sinks.
 *
 * @example
 * ```ts
 * const log = createLogger('quests')
 * log.info('Quest created', { questId: 'abc123' })
 * // [INFO ] 2024-01-15T10:30:00.000Z [quests] Quest created { questId: 'abc123' }
 * ```
 */
export function createLogger(source: string, options?: LoggerOptions): Logger {
  return new LoggerImpl(source, {
    minLevel: options?.minLevel ?? globalMinLevel,
    sinks:    options?.sinks    ?? globalSinks,
  });
}

/**
 * Reconfigure the global defaults that all future loggers will inherit.
 * Call once during app boot — before any module loggers are created.
 *
 * @param options.minLevel - New global minimum log level.
 * @param options.addSink  - Append an additional sink (e.g. a file writer).
 * @param options.replaceSinks - Replace all sinks (including the default
 *                               console sink) with the supplied array.
 */
export function configureLogger(options: {
  minLevel?: LogLevel;
  addSink?: LogSink;
  replaceSinks?: LogSink[];
}): void {
  if (options.minLevel     !== undefined) globalMinLevel = options.minLevel;
  if (options.addSink      !== undefined) globalSinks.push(options.addSink);
  if (options.replaceSinks !== undefined) {
    globalSinks.length = 0;
    globalSinks.push(...options.replaceSinks);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function levelFromWeight(weight: number): LogLevel {
  for (const [k, v] of Object.entries(LOG_LEVEL_WEIGHT) as [LogLevel, number][]) {
    if (v === weight) return k;
  }
  return 'debug';
}
