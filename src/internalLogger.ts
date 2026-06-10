import { IS_PROD } from './config/env';

export type DebugLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'log';

const LEVEL_PRIORITY: Record<DebugLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  log: 5,
};

let currentLevel: DebugLevel = 'warn';

export const setInternalDebugLevel = (level: DebugLevel): void => {
  currentLevel = level;
};

const PREFIX = '[OSD]';

/**
 * Resolves the safest console function for internal use.
 * Prefers window.console.originalX (set before the tool wraps console) to avoid
 * the infinite-loop where a log call creates a new UI entry which triggers another log.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop: (...args: unknown[]) => void = () => {};

type ConsoleWithOriginals = Console & {
  originalLog?: (...args: unknown[]) => void;
  originalDebug?: (...args: unknown[]) => void;
  originalInfo?: (...args: unknown[]) => void;
  originalWarn?: (...args: unknown[]) => void;
  originalError?: (...args: unknown[]) => void;
};

const resolveConsoleFn = (
  method: 'log' | 'debug' | 'info' | 'warn' | 'error'
): ((...args: unknown[]) => void) => {
  const c = window.console as ConsoleWithOriginals;
  const key = `original${method[0].toUpperCase()}${method.slice(1)}` as keyof ConsoleWithOriginals;
  const fn = c[key] ?? c[method];

  return typeof fn === 'function'
    ? (fn as (...args: unknown[]) => void).bind(window.console)
    : noop;
};

const shouldEmit = (level: DebugLevel): boolean =>
  !IS_PROD && LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[currentLevel];

export const internalLogger = {
  error(...args: unknown[]): void {
    if (shouldEmit('error')) {
      resolveConsoleFn('error')(PREFIX, ...args);
    }
  },
  warn(...args: unknown[]): void {
    if (shouldEmit('warn')) {
      resolveConsoleFn('warn')(PREFIX, ...args);
    }
  },
  info(...args: unknown[]): void {
    if (shouldEmit('info')) {
      resolveConsoleFn('info')(PREFIX, ...args);
    }
  },
  debug(...args: unknown[]): void {
    if (shouldEmit('debug')) {
      resolveConsoleFn('debug')(PREFIX, ...args);
    }
  },
  log(...args: unknown[]): void {
    if (shouldEmit('log')) {
      resolveConsoleFn('log')(PREFIX, ...args);
    }
  },
};
