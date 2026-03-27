import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type OnScreenDebuggerMode =
  | 'off'
  | 'active-on-demand'
  | 'active-on-start';

export type DebugModalVisibility = 'hidden' | 'not-focusable' | 'focusable';

export type LogEntryType =
  | 'log'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'networkTraffic';

export interface CallSiteInfo {
  file: string | null;
  line: number | null;
  column: number | null;
  functionName: string | null;
  rawStack: string;
}

export type FetchEntryType = {
  url: string;
  options: {
    body?: unknown;
    method?: string;
    headers?: Record<string, string>;
    credentials?: string;
    mode?: string;
    cache?: string;
    redirect?: string;
    referrer?: string;
    referrerPolicy?: string;
    integrity?: string;
    keepalive?: boolean;
    duplex?: string;
  };
  response: {
    json?: unknown;
    error?: unknown;
    status?: number;
  };
};

export type LogEntry = {
  params: string[];
  extraParams?: {
    networkTraffic?: FetchEntryType;
    options?: Record<string, unknown>;
    log?: string[];
  };
  callSite?: CallSiteInfo;
  time: number;
  type: LogEntryType;
  id: string;
};

export type LogPayload = {
  params: string[];
  callSite?: CallSiteInfo;
};

// ============================================================================
// Constants
// ============================================================================

const ENTRIES_LIMIT = 100;
const ENTRIES_FLUSH_AMOUNT = 20;
const ENTRIES_NETWORK_TRAFFIC_LIMIT = 500;
const ENTRIES_NETWORK_TRAFFIC_FLUSH_AMOUNT = 100;
const DEBUG_ENTRY_PREFIX = 'DEBUG_ENTRY_';

// ============================================================================
// Helpers
// ============================================================================

function boundedPush(
  arr: LogEntry[],
  entry: LogEntry,
  limit: number,
  flush: number,
): LogEntry[] {
  const next = arr.length >= limit ? arr.slice(flush) : [...arr];

  next.push(entry);

  return next;
}

function makeId(type: string, params: string[]): string {
  return `${DEBUG_ENTRY_PREFIX}${Date.now()}_${Math.random().toString()}_${type}_${
    params.join(' ') ?? 'params_na'
  }`;
}

function makeLogEntry(type: LogEntryType, payload: LogPayload): LogEntry {
  return {
    params: payload.params,
    callSite: payload.callSite,
    extraParams: {
      log: [
        `Type: ${type}`,
        `Content:`,
        payload?.params?.join(' ') ?? 'params_na',
        `Location: File ${
          payload.callSite?.file?.split('/').pop() ?? 'file_na'
        } - Function ${payload.callSite?.functionName ?? 'function_na'}`,
      ],
    },
    time: Date.now(),
    id: makeId(type, payload.params),
    type,
  };
}

function assembleFetchParams(payload: FetchEntryType): string[] {
  const method = payload.options?.method ?? 'GET';
  const status = payload.response?.status ?? 0;
  const urlSegment = payload.url?.split('/').pop() ?? 'url_na';

  return [method, String(status), urlSegment];
}

// ============================================================================
// Store
// ============================================================================

interface DebuggerState {
  log: LogEntry[];
  debug: LogEntry[];
  info: LogEntry[];
  warn: LogEntry[];
  error: LogEntry[];
  networkTraffic: LogEntry[];
  recordLog: boolean;
  recordDebug: boolean;
  recordInfo: boolean;
  recordWarn: boolean;
  recordError: boolean;
  recordNetworkTraffic: boolean;
  quickKeySequence: boolean;
  debugModalVisibility: DebugModalVisibility;
  lastChangeTime: number;
  isEnabled: OnScreenDebuggerMode;
}

interface DebuggerActions {
  addLog(payload: LogPayload): void;
  addDebug(payload: LogPayload): void;
  addInfo(payload: LogPayload): void;
  addWarn(payload: LogPayload): void;
  addError(payload: LogPayload): void;
  addNetworkTraffic(payload: FetchEntryType): void;
  setRecordLog(value: boolean): void;
  setRecordDebug(value: boolean): void;
  setRecordInfo(value: boolean): void;
  setRecordWarn(value: boolean): void;
  setRecordError(value: boolean): void;
  setRecordNetworkTraffic(value: boolean): void;
  setQuickKeySequence(value: boolean): void;
  setShowDebugModal(visibility: DebugModalVisibility): void;
  enableOnScreenDebugger(mode: OnScreenDebuggerMode): void;
  setOnScreenDebuggerEnabledPersistent(
    mode: OnScreenDebuggerMode,
    storageKeyPrefix?: string,
  ): void;
  flushLogs(): void;
  flushDebugs(): void;
  flushInfos(): void;
  flushWarns(): void;
  flushErrors(): void;
  flushNetworkTraffic(): void;
}

export type DebuggerStore = DebuggerState & DebuggerActions;

export const debuggerStore = create<DebuggerStore>((set, get) => ({
  log: [],
  debug: [],
  info: [],
  warn: [],
  error: [],
  networkTraffic: [],
  recordLog: true,
  recordDebug: true,
  recordInfo: true,
  recordWarn: true,
  recordError: true,
  recordNetworkTraffic: true,
  quickKeySequence: true,
  debugModalVisibility: 'hidden',
  lastChangeTime: 0,
  isEnabled: 'off',

  addLog: payload =>
    set(s => ({
      log: boundedPush(
        s.log,
        makeLogEntry('log', payload),
        ENTRIES_LIMIT,
        ENTRIES_FLUSH_AMOUNT,
      ),
    })),

  addDebug: payload =>
    set(s => ({
      debug: boundedPush(
        s.debug,
        makeLogEntry('debug', payload),
        ENTRIES_LIMIT,
        ENTRIES_FLUSH_AMOUNT,
      ),
    })),

  addInfo: payload =>
    set(s => ({
      info: boundedPush(
        s.info,
        makeLogEntry('info', payload),
        ENTRIES_LIMIT,
        ENTRIES_FLUSH_AMOUNT,
      ),
    })),

  addWarn: payload =>
    set(s => ({
      warn: boundedPush(
        s.warn,
        makeLogEntry('warn', payload),
        ENTRIES_LIMIT,
        ENTRIES_FLUSH_AMOUNT,
      ),
    })),

  addError: payload =>
    set(s => ({
      error: boundedPush(
        s.error,
        makeLogEntry('error', payload),
        ENTRIES_LIMIT,
        ENTRIES_FLUSH_AMOUNT,
      ),
    })),

  addNetworkTraffic: payload => {
    const newEntry: LogEntry = {
      params: assembleFetchParams(payload),
      extraParams: {
        networkTraffic: payload,
        options: payload.options as Record<string, unknown>,
      },
      time: Date.now(),
      id: `${DEBUG_ENTRY_PREFIX}${Date.now()}_${Math.random().toString()}_networkTraffic_${
        payload.url
      }`,
      type: 'networkTraffic',
    };

    set(s => {
      const isDuplicate = s.networkTraffic.some(
        e =>
          e.extraParams?.networkTraffic?.url === payload.url &&
          e.time === newEntry.time,
      );

      if (isDuplicate) {
        return s;
      }

      return {
        networkTraffic: boundedPush(
          s.networkTraffic,
          newEntry,
          ENTRIES_NETWORK_TRAFFIC_LIMIT,
          ENTRIES_NETWORK_TRAFFIC_FLUSH_AMOUNT,
        ),
      };
    });
  },

  setRecordLog: value => set({ recordLog: value }),
  setRecordDebug: value => set({ recordDebug: value }),
  setRecordInfo: value => set({ recordInfo: value }),
  setRecordWarn: value => set({ recordWarn: value }),
  setRecordError: value => set({ recordError: value }),
  setRecordNetworkTraffic: value => set({ recordNetworkTraffic: value }),
  setQuickKeySequence: value => set({ quickKeySequence: value }),

  setShowDebugModal: visibility => {
    const { isEnabled } = get();

    set({
      debugModalVisibility: isEnabled !== 'off' ? visibility : 'hidden',
      lastChangeTime: Date.now(),
    });
  },

  enableOnScreenDebugger: mode => set({ isEnabled: mode }),

  setOnScreenDebuggerEnabledPersistent: (
    mode,
    storageKeyPrefix = 'debugger',
  ) => {
    try {
      localStorage.setItem(`${storageKeyPrefix}_mode`, mode);
    } catch {
      // localStorage may not be available
    }
  },

  flushLogs: () => set({ log: [] }),
  flushDebugs: () => set({ debug: [] }),
  flushInfos: () => set({ info: [] }),
  flushWarns: () => set({ warn: [] }),
  flushErrors: () => set({ error: [] }),
  flushNetworkTraffic: () => set({ networkTraffic: [] }),
}));

/**
 * Access store state outside of React (e.g. in canListenToKeyEvents).
 */
export const getDebuggerState = (): DebuggerStore => debuggerStore.getState();

/**
 * Initialize the store's isEnabled from persisted storage.
 * Call this once at app startup before rendering <OnScreenDebugger>.
 */
export function initDebuggerFromStorage(storageKeyPrefix = 'debugger'): void {
  try {
    const stored = localStorage.getItem(
      `${storageKeyPrefix}_mode`,
    ) as OnScreenDebuggerMode | null;
    const validModes: OnScreenDebuggerMode[] = [
      'off',
      'active-on-demand',
      'active-on-start',
    ];

    if (stored && validModes.includes(stored)) {
      const visibility =
        stored === 'active-on-start' ? 'not-focusable' : 'hidden';

      debuggerStore.setState({
        isEnabled: stored,
        debugModalVisibility: visibility,
      });
    }
  } catch {
    // localStorage may not be available
  }
}
