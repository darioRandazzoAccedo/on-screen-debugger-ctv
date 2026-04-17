import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { CallSiteInfo } from '../utils';
import * as osdStorage from '../storage';
import { APP_ENV } from '../config/env';

const IS_INTERNAL_BUILD = APP_ENV !== 'production';

export type DebugModalVisibility = 'hidden' | 'not-focusable' | 'focusable';

export type LogEntryType = 'log' | 'debug' | 'info' | 'warn' | 'error' | 'networkTraffic';

export type FetchEntryType = {
  url: string;
  options: {
    body?: any;
    method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
    headers?: Record<string, string>;
    credentials?: 'include' | 'omit' | 'same-origin';
    mode?: 'cors' | 'no-cors' | 'same-origin';
    cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
    redirect?: 'follow' | 'error' | 'manual';
    referrer?: 'client' | 'no-referrer';
    referrerPolicy?:
      | 'no-referrer'
      | 'no-referrer-when-downgrade'
      | 'origin'
      | 'origin-when-cross-origin'
      | 'same-origin'
      | 'strict-origin'
      | 'strict-origin-when-cross-origin'
      | 'unsafe-url';
    integrity?: string;
    keepalive?: boolean;
    signal?: AbortSignal;
    window?: Window | null;
    agent?: any;
    duplex?: 'half' | 'full';
  };
  response: {
    json?: string | null;
    error?: string | null;
    status?: number;
  };
};

type SerializableFetchEntryType = Omit<FetchEntryType, 'options'> & {
  options: Omit<FetchEntryType['options'], 'signal' | 'window' | 'agent'>;
};

export type LogEntry = {
  params: string[];
  extraParams?: {
    networkTraffic?: SerializableFetchEntryType;
    options?: Record<string, any>;
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

export type OnScreenDebuggerMode = osdStorage.OnScreenDebuggerMode;

type SetFocusPayload = {
  id: string;
  focusedId: string;
  isFirstFocus: boolean;
};

const ENTRIES_LIMIT = 100;
const ENTRIES_FLUSH_AMOUNT = ENTRIES_LIMIT * 0.5;
const DEBUG_ENTRY_PREFIX = 'DEBUG_ENTRY_';
const ENTRIES_NETWORK_TRAFFIC_LIMIT = 500;
const ENTRIES_NETWORK_TRAFFIC_FLUSH_AMOUNT = ENTRIES_NETWORK_TRAFFIC_LIMIT * 0.5;

const assembleFetchParams = (payload: FetchEntryType) => {
  const method = payload.options?.method ?? 'GET';
  const status = payload.response?.status ?? 0;
  const urlSegment = payload.url?.split('/').pop() ?? 'url_na';

  return [method, String(status), urlSegment];
};

const initialIsEnabled = (): OnScreenDebuggerMode =>
  IS_INTERNAL_BUILD ? osdStorage.debuggerAppStartDevOption.get() : 'off';

const debugModalVisibilityFromIsEnabled = (
  isEnabled: OnScreenDebuggerMode
): DebugModalVisibility => (isEnabled === 'active-on-start' ? 'not-focusable' : 'hidden');

const initialDebuggerState = (() => {
  const isEnabled = initialIsEnabled();

  return {
    isEnabled,
    debugModalVisibility: debugModalVisibilityFromIsEnabled(isEnabled),
  };
})();

export type OnScreenDebuggerStoreState = {
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
  focusedScrollIds: Record<string, string>;
  /** Mirrors Redux scroll.backClicked for debugger scroll views (synced in useSyncDebuggerScrollBackFromRedux). */
  debuggerScrollBackNonce: number;
  /** Scroll position state for debugger scroll containers only (not app Header). */
  debuggerScrollIsScrolled: boolean;
  setDebuggerScrollIsScrolled: (v: boolean) => void;
  addLog: (payload: LogPayload) => void;
  addDebug: (payload: LogPayload) => void;
  addInfo: (payload: LogPayload) => void;
  addWarn: (payload: LogPayload) => void;
  addError: (payload: LogPayload) => void;
  addNetworkTraffic: (payload: FetchEntryType) => void;
  setRecordLog: (v: boolean) => void;
  setRecordDebug: (v: boolean) => void;
  setRecordInfo: (v: boolean) => void;
  setRecordWarn: (v: boolean) => void;
  setRecordError: (v: boolean) => void;
  setRecordNetworkTraffic: (v: boolean) => void;
  flushLogs: () => void;
  flushDebugs: () => void;
  flushInfos: () => void;
  flushWarns: () => void;
  flushErrors: () => void;
  flushNetworkTraffic: () => void;
  setShowDebugModal: (v: DebugModalVisibility) => void;
  enableOnScreenDebugger: (v: OnScreenDebuggerMode) => void;
  setOnScreenDebuggerEnabledPersistent: (v: OnScreenDebuggerMode) => void;
  setQuickKeySequence: (v: boolean) => void;
  setFocusedScrollId: (payload: SetFocusPayload) => void;
  clearFocusedScrollState: (scrollId: string) => void;
};

const pushLogEntry = (
  list: LogEntry[],
  payload: LogPayload,
  type: LogEntryType,
  extraLogLines: string[]
) => {
  if (list.length >= ENTRIES_LIMIT) {
    list.splice(0, ENTRIES_FLUSH_AMOUNT);
  }

  list.push({
    params: payload.params,
    callSite: payload.callSite,
    extraParams: {
      log: extraLogLines,
    },
    time: Date.now(),
    id: `${DEBUG_ENTRY_PREFIX}${Date.now()}_${Math.random().toString()}_${type}_${
      payload.params?.join(' ') ?? 'params_na'
    }`,
    type,
  });
};

export const useOnScreenDebuggerStore = create<OnScreenDebuggerStoreState>()(
  persist(
    (set, get) => ({
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
      lastChangeTime: 0,
      ...initialDebuggerState,
      focusedScrollIds: {},
      debuggerScrollBackNonce: 0,
      debuggerScrollIsScrolled: false,

      setDebuggerScrollIsScrolled: debuggerScrollIsScrolled => set({ debuggerScrollIsScrolled }),

      setRecordLog: recordLog => set({ recordLog }),
      flushLogs: () => set({ log: [] }),
      setRecordDebug: recordDebug => set({ recordDebug }),
      flushDebugs: () => set({ debug: [] }),
      setRecordInfo: recordInfo => set({ recordInfo }),
      flushInfos: () => set({ info: [] }),
      setRecordWarn: recordWarn => set({ recordWarn }),
      flushWarns: () => set({ warn: [] }),
      setRecordError: recordError => set({ recordError }),
      flushErrors: () => set({ error: [] }),
      setRecordNetworkTraffic: recordNetworkTraffic => set({ recordNetworkTraffic }),
      flushNetworkTraffic: () => set({ networkTraffic: [] }),

      addLog: payload => {
        if (!get().recordLog) {
          return;
        }

        set(s => {
          const log = [...s.log];

          pushLogEntry(log, payload, 'log', [
            `Type: log`,
            `Content:`,
            payload?.params?.join(' ') ?? 'params_na',
            `Location: File ${
              payload.callSite?.file?.split('/').pop() ?? 'file_na'
            } - Function ${payload.callSite?.functionName ?? 'function_na'}`,
          ]);

          return { log };
        });
      },

      addDebug: payload => {
        if (!get().recordDebug) {
          return;
        }

        set(s => {
          const debug = [...s.debug];

          pushLogEntry(debug, payload, 'debug', [
            `Type: debug`,
            `Content:`,
            payload?.params?.join(' ') ?? 'params_na',
            `Location: File ${
              payload.callSite?.file?.split('/').pop() ?? 'file_na'
            } - Function ${payload.callSite?.functionName ?? 'function_na'}`,
          ]);

          return { debug };
        });
      },

      addInfo: payload => {
        if (!get().recordInfo) {
          return;
        }

        set(s => {
          const info = [...s.info];

          pushLogEntry(info, payload, 'info', [
            `Type: info`,
            `Content:`,
            payload?.params?.join(' ') ?? 'params_na',
            `Location: File ${
              payload.callSite?.file?.split('/').pop() ?? 'file_na'
            } - Function ${payload.callSite?.functionName ?? 'function_na'}`,
          ]);

          return { info };
        });
      },

      addWarn: payload => {
        if (!get().recordWarn) {
          return;
        }

        set(s => {
          const warn = [...s.warn];

          pushLogEntry(warn, payload, 'warn', [
            `Type: warn`,
            `Content:`,
            payload?.params?.join(' ') ?? 'params_na',
            `Location: File ${
              payload.callSite?.file?.split('/').pop() ?? 'file_na'
            } - Function ${payload.callSite?.functionName ?? 'function_na'}`,
          ]);

          return { warn };
        });
      },

      addError: payload => {
        if (!get().recordError) {
          return;
        }

        set(s => {
          const error = [...s.error];

          pushLogEntry(error, payload, 'error', [
            `Type: error`,
            `Content:`,
            payload?.params?.join(' ') ?? 'params_na',
            `Location: File ${
              payload.callSite?.file?.split('/').pop() ?? 'file_na'
            } - Function ${payload.callSite?.functionName ?? 'function_na'}`,
          ]);

          return { error };
        });
      },

      addNetworkTraffic: payload => {
        if (!get().recordNetworkTraffic) {
          return;
        }

        set(s => {
          const networkTraffic = [...s.networkTraffic];

          if (networkTraffic.length >= ENTRIES_NETWORK_TRAFFIC_LIMIT) {
            networkTraffic.splice(0, ENTRIES_NETWORK_TRAFFIC_FLUSH_AMOUNT);
          }

          const newEntry: LogEntry = {
            params: assembleFetchParams(payload),
            extraParams: {
              networkTraffic: payload,
              options: payload.options,
            },
            time: Date.now(),
            id: `${DEBUG_ENTRY_PREFIX}${Date.now()}_${Math.random().toString()}_networkTraffic_${
              payload.url
            }`,
            type: 'networkTraffic',
          };

          const idx = networkTraffic.findIndex(
            entry =>
              entry.extraParams?.networkTraffic?.url === payload.url && entry.time === newEntry.time
          );

          if (idx === -1) {
            networkTraffic.push(newEntry);
          } else {
            console.error('trying to insert duplicate network traffic entry, SKIPPED: ', newEntry);
          }

          return { networkTraffic };
        });
      },

      setShowDebugModal: debugModalVisibility => {
        const { isEnabled } = get();

        set({
          debugModalVisibility: isEnabled !== 'off' ? debugModalVisibility : 'hidden',
          lastChangeTime: Date.now(),
        });
      },

      enableOnScreenDebugger: isEnabled => set({ isEnabled }),

      setOnScreenDebuggerEnabledPersistent: mode => {
        osdStorage.debuggerAppStartDevOption.set(mode);
      },

      setQuickKeySequence: quickKeySequence => set({ quickKeySequence }),

      setFocusedScrollId: ({ id, focusedId, isFirstFocus }) => {
        set(s => {
          if (isFirstFocus && s.focusedScrollIds[id]) {
            return s;
          }

          return {
            focusedScrollIds: {
              ...s.focusedScrollIds,
              [id]: focusedId,
            },
          };
        });
      },

      clearFocusedScrollState: scrollId => {
        set(s => {
          const { [scrollId]: _, ...rest } = s.focusedScrollIds;

          return { focusedScrollIds: rest };
        });
      },
    }),
    {
      name: 'on-screen-debugger',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<OnScreenDebuggerStoreState> | undefined;
        const { debugModalVisibility: _discarded, ...rest } = persisted ?? {};
        const merged = {
          ...currentState,
          ...rest,
        } as OnScreenDebuggerStoreState;

        merged.debugModalVisibility = debugModalVisibilityFromIsEnabled(merged.isEnabled);

        return merged;
      },
      partialize: s => ({
        isEnabled: s.isEnabled,
        quickKeySequence: s.quickKeySequence,
        recordLog: s.recordLog,
        recordDebug: s.recordDebug,
        recordInfo: s.recordInfo,
        recordWarn: s.recordWarn,
        recordError: s.recordError,
        recordNetworkTraffic: s.recordNetworkTraffic,
      }),
    }
  )
);

export const useIsDebuggerEnabled = () => useOnScreenDebuggerStore(s => s.isEnabled);

export const useDebugModalVisibility = () => useOnScreenDebuggerStore(s => s.debugModalVisibility);

export const getDebugModalVisibilitySync = () =>
  useOnScreenDebuggerStore.getState().debugModalVisibility;

/** Same “tool on” signal as the on-screen debugger (internal build + dev option / persisted state). */
export const getIsOnScreenDebuggerActiveSync = (): boolean =>
  useOnScreenDebuggerStore.getState().isEnabled !== 'off';
