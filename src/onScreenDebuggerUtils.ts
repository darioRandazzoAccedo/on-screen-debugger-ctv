import { DEBUG_UI_MODAL, networkApiFilterNavId, networkApiFilterNavMapKey } from './navigatioMap';
import { useOnScreenDebuggerStore } from './store/onScreenDebuggerStore';
import type { LogEntry } from './store/onScreenDebuggerStore';
import { LABELS } from './onScreenDebuggerLabels';

const osd = () => useOnScreenDebuggerStore.getState();

const setRecordLog = (v: boolean) => osd().setRecordLog(v);
const setRecordDebug = (v: boolean) => osd().setRecordDebug(v);
const setRecordInfo = (v: boolean) => osd().setRecordInfo(v);
const setRecordWarn = (v: boolean) => osd().setRecordWarn(v);
const setRecordError = (v: boolean) => osd().setRecordError(v);
const setRecordNetworkTraffic = (v: boolean) => osd().setRecordNetworkTraffic(v);
const flushLogs = () => osd().flushLogs();
const flushDebugs = () => osd().flushDebugs();
const flushInfos = () => osd().flushInfos();
const flushWarns = () => osd().flushWarns();
const flushErrors = () => osd().flushErrors();
const flushNetworkTraffic = () => osd().flushNetworkTraffic();

const {
  CONTAINER,
  FOCUS_MAIN_APP_BUTTON,
  AUTO_SCROLL_TO_NEW_ENTRY_BUTTON,
  AUTO_REFRESH_BUTTON,
  QUIT_DEBUGGER_BUTTON,
  SWITCH_DEBUG_VIEW_BUTTON,
  DEBUG_MODE_LOGS_BUTTON,
  DEBUG_MODE_DEBUG_BUTTON,
  DEBUG_MODE_INFO_BUTTON,
  DEBUG_MODE_WARN_BUTTON,
  DEBUG_MODE_ERRORS_BUTTON,
  DEBUG_MODE_ALL_BUTTON,
  DEBUG_MODE_FETCH_XHR_BUTTON,
  DEBUG_MODE_OTHER_NETWORK_BUTTON,
  DEBUG_MODE_ALL_NETWORK_BUTTON,
  DEBUG_MODE_ALL_ANALYTICS_BUTTON,
  QUICK_ACTIONS_CONTAINER,
  DEBUG_MODE_CONTAINER,
  DEBUG_MODE_NETWORK_CONTAINER,
  DEBUG_MODE_NETWORK_API_CONTAINER,
  DEBUG_MODE_ENTRIES_LIST,
  SETTINGS_CONTAINER,
  QUICK_KEY_SEQUENCE_BUTTON,
  RECORDING_STATUS_CONTAINER,
  RECORD_LOG_BUTTON,
  RECORD_DEBUG_BUTTON,
  RECORD_INFO_BUTTON,
  RECORD_WARN_BUTTON,
  RECORD_ERROR_BUTTON,
  RECORD_NETWORK_TRAFFIC_BUTTON,
  FLUSH_CONTAINER,
  FLUSH_LOG_BUTTON,
  FLUSH_DEBUG_BUTTON,
  FLUSH_INFO_BUTTON,
  FLUSH_WARN_BUTTON,
  FLUSH_ERROR_BUTTON,
  FLUSH_NETWORK_TRAFFIC_BUTTON,
} = DEBUG_UI_MODAL;

// --- Types ---

/** Built-in filter modes plus host-defined keys from `networkApiUrlPatterns`. */
export type OnScreenDebuggerFilterOptions =
  | 'logs'
  | 'debug'
  | 'info'
  | 'warn'
  | 'errors'
  | 'all_terminal'
  | 'fetch_xhr'
  | 'other_network'
  | 'all_network'
  | 'all_analytics'
  // Host-defined API keys are strings; `string & {}` avoids collapsing the whole union to `string`.
  | (string & Record<never, never>);

export type FilterButtonConfig = {
  mode: OnScreenDebuggerFilterOptions;
  navKey: string;
  label: string;
  ariaLabel: string;
};

export type RecordingButtonConfig = {
  navKey: string;
  label: string;
  ariaLabel: string;
  selectorKey:
    | 'recordLog'
    | 'recordDebug'
    | 'recordInfo'
    | 'recordWarn'
    | 'recordError'
    | 'recordNetworkTraffic';
  action: typeof setRecordLog;
};

export type FlushButtonConfig = {
  navKey: string;
  label: string;
  ariaLabel: string;
  action: typeof flushLogs;
};

// --- Constants ---

export const HALF_HEIGHT_MODAL = 500;
export const ENTRIES_SCROLL_ID = 'debug-ui-modal-entries';
export const TOOLBAR_SCROLL_ID = 'debug-ui-modal-toolbar';

export const getNetworkUrlFilterModes = (
  urlPatterns: Record<string, string>
): OnScreenDebuggerFilterOptions[] => [
  'fetch_xhr',
  'other_network',
  'all_network',
  ...(Object.keys(urlPatterns) as OnScreenDebuggerFilterOptions[]),
  'all_analytics',
];

// --- Pure functions ---

export const isNetworkFilters = (
  filt: OnScreenDebuggerFilterOptions,
  urlPatterns: Record<string, string>
): boolean => getNetworkUrlFilterModes(urlPatterns).includes(filt);

/**
 * Safely parses a JSON string, returning a fallback value on failure.
 */
export const safeJsonParse = (value: string, fallback: unknown = {}): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/**
 * Checks if a network traffic entry is a fetch or XMLHttpRequest request.
 * Returns true for fetch/xhr, false for other types (img, css, script, etc.)
 */
const isFetchOrXhr = (entry: LogEntry): boolean => {
  const performanceHeader = entry.extraParams?.networkTraffic?.options?.headers?.['x-performance'];

  if (performanceHeader) {
    try {
      const performanceInfo = JSON.parse(performanceHeader);
      const initiatorType = performanceInfo?.initiatorType;

      return initiatorType === 'fetch' || initiatorType === 'xmlhttprequest';
    } catch {
      // If we can't parse, check if the source string contains fetch
      return performanceHeader.includes('fetch');
    }
  }

  // Default to true for entries without performance info (likely fetch/xhr)
  return true;
};

/**
 * Filters network traffic entries based on the filter type.
 */
export const filterNetworkTraffic = (
  entries: LogEntry[],
  filterType: 'fetch_xhr' | 'other_network' | 'all_network'
): LogEntry[] => {
  switch (filterType) {
    case 'fetch_xhr':
      return entries.filter(isFetchOrXhr);
    case 'other_network':
      return entries.filter(entry => !isFetchOrXhr(entry));
    case 'all_network':
    default:
      return entries;
  }
};

/**
 * Filters network traffic entries based on URL patterns.
 * `filterType` is `all_analytics` or a key of `urlPatterns`.
 */
export const filterNetworkTrafficByUrl = (
  entries: LogEntry[],
  filterType: 'all_analytics' | string,
  urlPatterns: Record<string, string>
): LogEntry[] => {
  if (filterType === 'all_analytics') {
    const allPatterns = Object.values(urlPatterns);

    if (allPatterns.length === 0) {
      return [];
    }

    return entries.filter(entry => {
      const url = entry.extraParams?.networkTraffic?.url ?? '';

      return allPatterns.some(pattern => url.includes(pattern));
    });
  }

  const pattern = urlPatterns[filterType];

  if (pattern === undefined) {
    return [];
  }

  return entries.filter(entry => {
    const url = entry.extraParams?.networkTraffic?.url ?? '';

    return url.includes(pattern);
  });
};

// --- Nav map ---

const mapDebugEntries = (entries: LogEntry[]): EnhancedNavMap => {
  const entriesNav: EnhancedNavMap = {};

  entries.forEach(entry => {
    const entryId = entry.id;

    entriesNav[entryId] = {
      id: entryId,
      parent: DEBUG_MODE_ENTRIES_LIST,
    };
  });

  return entriesNav;
};

const buildNetworkApiNavEntries = (networkApiKeys: string[]): EnhancedNavMap => {
  const dynamic: EnhancedNavMap = {};

  networkApiKeys.forEach(key => {
    const mapKey = networkApiFilterNavMapKey(key);

    dynamic[mapKey] = {
      id: networkApiFilterNavId(key),
      parent: DEBUG_MODE_NETWORK_API_CONTAINER,
    };
  });

  return dynamic;
};

export const createNavMap = (
  entries: LogEntry[],
  networkApiKeys: string[] = []
): EnhancedNavMap => {
  const entriesNav = mapDebugEntries(entries);
  const entryKeys = Object.keys(entriesNav);
  const lastEntry = entriesNav[entryKeys[entryKeys.length - 1]];
  const networkApiNavEntries = buildNetworkApiNavEntries(networkApiKeys);

  return {
    MODAL_CONTAINER: {
      id: CONTAINER,
      orientation: 'vertical',
    },
    QUICK_ACTIONS_CONTAINER: {
      id: QUICK_ACTIONS_CONTAINER,
      parent: CONTAINER,
      orientation: 'horizontal',
    },
    SETTINGS_CONTAINER: {
      id: SETTINGS_CONTAINER,
      parent: CONTAINER,
      orientation: 'horizontal',
    },
    DEBUG_MODE_CONTAINER: {
      id: DEBUG_MODE_CONTAINER,
      parent: CONTAINER,
      orientation: 'horizontal',
    },
    DEBUG_MODE_NETWORK_CONTAINER: {
      id: DEBUG_MODE_NETWORK_CONTAINER,
      parent: CONTAINER,
      orientation: 'horizontal',
    },
    DEBUG_MODE_NETWORK_API_CONTAINER: {
      id: DEBUG_MODE_NETWORK_API_CONTAINER,
      parent: CONTAINER,
      orientation: 'horizontal',
    },
    DEBUG_MODE_ENTRIES_LIST: {
      id: DEBUG_MODE_ENTRIES_LIST,
      parent: CONTAINER,
      orientation: 'vertical',
      forwardFocus: lastEntry?.id ?? '',
    },
    FOCUS_MAIN_APP_BUTTON: {
      id: FOCUS_MAIN_APP_BUTTON,
      parent: QUICK_ACTIONS_CONTAINER,
    },
    AUTO_SCROLL_TO_NEW_ENTRY_BUTTON: {
      id: AUTO_SCROLL_TO_NEW_ENTRY_BUTTON,
      parent: SETTINGS_CONTAINER,
    },
    AUTO_REFRESH_BUTTON: {
      id: AUTO_REFRESH_BUTTON,
      parent: SETTINGS_CONTAINER,
    },
    QUICK_KEY_SEQUENCE_BUTTON: {
      id: QUICK_KEY_SEQUENCE_BUTTON,
      parent: SETTINGS_CONTAINER,
    },
    QUIT_DEBUGGER_BUTTON: {
      id: QUIT_DEBUGGER_BUTTON,
      parent: QUICK_ACTIONS_CONTAINER,
    },
    SWITCH_DEBUG_VIEW_BUTTON: {
      id: SWITCH_DEBUG_VIEW_BUTTON,
      parent: QUICK_ACTIONS_CONTAINER,
    },
    DEBUG_MODE_LOGS_BUTTON: {
      id: DEBUG_MODE_LOGS_BUTTON,
      parent: DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_DEBUG_BUTTON: {
      id: DEBUG_MODE_DEBUG_BUTTON,
      parent: DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_INFO_BUTTON: {
      id: DEBUG_MODE_INFO_BUTTON,
      parent: DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_WARN_BUTTON: {
      id: DEBUG_MODE_WARN_BUTTON,
      parent: DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_ERRORS_BUTTON: {
      id: DEBUG_MODE_ERRORS_BUTTON,
      parent: DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_ALL_BUTTON: {
      id: DEBUG_MODE_ALL_BUTTON,
      parent: DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_FETCH_XHR_BUTTON: {
      id: DEBUG_MODE_FETCH_XHR_BUTTON,
      parent: DEBUG_MODE_NETWORK_CONTAINER,
    },
    DEBUG_MODE_OTHER_NETWORK_BUTTON: {
      id: DEBUG_MODE_OTHER_NETWORK_BUTTON,
      parent: DEBUG_MODE_NETWORK_CONTAINER,
    },
    DEBUG_MODE_ALL_NETWORK_BUTTON: {
      id: DEBUG_MODE_ALL_NETWORK_BUTTON,
      parent: DEBUG_MODE_NETWORK_CONTAINER,
    },
    ...networkApiNavEntries,
    DEBUG_MODE_ALL_ANALYTICS_BUTTON: {
      id: DEBUG_MODE_ALL_ANALYTICS_BUTTON,
      parent: DEBUG_MODE_NETWORK_API_CONTAINER,
    },
    RECORDING_STATUS_CONTAINER: {
      id: RECORDING_STATUS_CONTAINER,
      parent: CONTAINER,
      orientation: 'horizontal',
    },
    RECORD_LOG_BUTTON: {
      id: RECORD_LOG_BUTTON,
      parent: RECORDING_STATUS_CONTAINER,
    },
    RECORD_DEBUG_BUTTON: {
      id: RECORD_DEBUG_BUTTON,
      parent: RECORDING_STATUS_CONTAINER,
    },
    RECORD_INFO_BUTTON: {
      id: RECORD_INFO_BUTTON,
      parent: RECORDING_STATUS_CONTAINER,
    },
    RECORD_WARN_BUTTON: {
      id: RECORD_WARN_BUTTON,
      parent: RECORDING_STATUS_CONTAINER,
    },
    RECORD_ERROR_BUTTON: {
      id: RECORD_ERROR_BUTTON,
      parent: RECORDING_STATUS_CONTAINER,
    },
    RECORD_NETWORK_TRAFFIC_BUTTON: {
      id: RECORD_NETWORK_TRAFFIC_BUTTON,
      parent: RECORDING_STATUS_CONTAINER,
    },
    FLUSH_CONTAINER: {
      id: FLUSH_CONTAINER,
      parent: CONTAINER,
      orientation: 'horizontal',
    },
    FLUSH_LOG_BUTTON: {
      id: FLUSH_LOG_BUTTON,
      parent: FLUSH_CONTAINER,
    },
    FLUSH_DEBUG_BUTTON: {
      id: FLUSH_DEBUG_BUTTON,
      parent: FLUSH_CONTAINER,
    },
    FLUSH_INFO_BUTTON: {
      id: FLUSH_INFO_BUTTON,
      parent: FLUSH_CONTAINER,
    },
    FLUSH_WARN_BUTTON: {
      id: FLUSH_WARN_BUTTON,
      parent: FLUSH_CONTAINER,
    },
    FLUSH_ERROR_BUTTON: {
      id: FLUSH_ERROR_BUTTON,
      parent: FLUSH_CONTAINER,
    },
    FLUSH_NETWORK_TRAFFIC_BUTTON: {
      id: FLUSH_NETWORK_TRAFFIC_BUTTON,
      parent: FLUSH_CONTAINER,
    },
    ...entriesNav,
  };
};

// --- Button config arrays ---

export const TERMINAL_FILTER_BUTTONS: FilterButtonConfig[] = [
  {
    mode: 'logs',
    navKey: 'DEBUG_MODE_LOGS_BUTTON',
    label: LABELS.BTN_FILTER_LOGS,
    ariaLabel: LABELS.ARIA_FILTER_LOGS,
  },
  {
    mode: 'debug',
    navKey: 'DEBUG_MODE_DEBUG_BUTTON',
    label: LABELS.BTN_FILTER_DEBUG,
    ariaLabel: LABELS.ARIA_FILTER_DEBUG,
  },
  {
    mode: 'info',
    navKey: 'DEBUG_MODE_INFO_BUTTON',
    label: LABELS.BTN_FILTER_INFO,
    ariaLabel: LABELS.ARIA_FILTER_INFO,
  },
  {
    mode: 'warn',
    navKey: 'DEBUG_MODE_WARN_BUTTON',
    label: LABELS.BTN_FILTER_WARN,
    ariaLabel: LABELS.ARIA_FILTER_WARN,
  },
  {
    mode: 'errors',
    navKey: 'DEBUG_MODE_ERRORS_BUTTON',
    label: LABELS.BTN_FILTER_ERRORS,
    ariaLabel: LABELS.ARIA_FILTER_ERRORS,
  },
  {
    mode: 'all_terminal',
    navKey: 'DEBUG_MODE_ALL_BUTTON',
    label: LABELS.BTN_FILTER_ALL_TERMINAL,
    ariaLabel: LABELS.ARIA_FILTER_ALL,
  },
];

export const NETWORK_TYPE_FILTER_BUTTONS: FilterButtonConfig[] = [
  {
    mode: 'fetch_xhr',
    navKey: 'DEBUG_MODE_FETCH_XHR_BUTTON',
    label: LABELS.BTN_FILTER_FETCH_XHR,
    ariaLabel: LABELS.ARIA_FILTER_FETCH_XHR,
  },
  {
    mode: 'other_network',
    navKey: 'DEBUG_MODE_OTHER_NETWORK_BUTTON',
    label: LABELS.BTN_FILTER_OTHER_NETWORK,
    ariaLabel: LABELS.ARIA_FILTER_OTHER_NETWORK,
  },
  {
    mode: 'all_network',
    navKey: 'DEBUG_MODE_ALL_NETWORK_BUTTON',
    label: LABELS.BTN_FILTER_ALL_NETWORK,
    ariaLabel: LABELS.ARIA_FILTER_ALL_NETWORK,
  },
];

export const buildNetworkApiFilterButtons = (
  urlPatterns: Record<string, string>
): FilterButtonConfig[] => {
  const perKey = Object.keys(urlPatterns).map(
    (key): FilterButtonConfig => ({
      mode: key as OnScreenDebuggerFilterOptions,
      navKey: networkApiFilterNavMapKey(key),
      label: key,
      ariaLabel: `Network API filter: ${key}`,
    })
  );

  return [
    ...perKey,
    {
      mode: 'all_analytics',
      navKey: 'DEBUG_MODE_ALL_ANALYTICS_BUTTON',
      label: LABELS.BTN_FILTER_ALL_ANALYTICS,
      ariaLabel: LABELS.ARIA_FILTER_ALL_ANALYTICS,
    },
  ];
};

export const RECORDING_BUTTONS: RecordingButtonConfig[] = [
  {
    navKey: 'RECORD_LOG_BUTTON',
    label: LABELS.BTN_RECORD_LOG,
    ariaLabel: LABELS.ARIA_RECORD_LOG,
    selectorKey: 'recordLog',
    action: setRecordLog,
  },
  {
    navKey: 'RECORD_DEBUG_BUTTON',
    label: LABELS.BTN_RECORD_DEBUG,
    ariaLabel: LABELS.ARIA_RECORD_DEBUG,
    selectorKey: 'recordDebug',
    action: setRecordDebug,
  },
  {
    navKey: 'RECORD_INFO_BUTTON',
    label: LABELS.BTN_RECORD_INFO,
    ariaLabel: LABELS.ARIA_RECORD_INFO,
    selectorKey: 'recordInfo',
    action: setRecordInfo,
  },
  {
    navKey: 'RECORD_WARN_BUTTON',
    label: LABELS.BTN_RECORD_WARN,
    ariaLabel: LABELS.ARIA_RECORD_WARN,
    selectorKey: 'recordWarn',
    action: setRecordWarn,
  },
  {
    navKey: 'RECORD_ERROR_BUTTON',
    label: LABELS.BTN_RECORD_ERROR,
    ariaLabel: LABELS.ARIA_RECORD_ERROR,
    selectorKey: 'recordError',
    action: setRecordError,
  },
  {
    navKey: 'RECORD_NETWORK_TRAFFIC_BUTTON',
    label: LABELS.BTN_RECORD_NETWORK,
    ariaLabel: LABELS.ARIA_RECORD_NETWORK_TRAFFIC,
    selectorKey: 'recordNetworkTraffic',
    action: setRecordNetworkTraffic,
  },
];

export const FLUSH_BUTTONS: FlushButtonConfig[] = [
  {
    navKey: 'FLUSH_LOG_BUTTON',
    label: LABELS.BTN_FLUSH_LOG,
    ariaLabel: LABELS.ARIA_FLUSH_LOG,
    action: flushLogs,
  },
  {
    navKey: 'FLUSH_DEBUG_BUTTON',
    label: LABELS.BTN_FLUSH_DEBUG,
    ariaLabel: LABELS.ARIA_FLUSH_DEBUG,
    action: flushDebugs,
  },
  {
    navKey: 'FLUSH_INFO_BUTTON',
    label: LABELS.BTN_FLUSH_INFO,
    ariaLabel: LABELS.ARIA_FLUSH_INFO,
    action: flushInfos,
  },
  {
    navKey: 'FLUSH_WARN_BUTTON',
    label: LABELS.BTN_FLUSH_WARN,
    ariaLabel: LABELS.ARIA_FLUSH_WARN,
    action: flushWarns,
  },
  {
    navKey: 'FLUSH_ERROR_BUTTON',
    label: LABELS.BTN_FLUSH_ERROR,
    ariaLabel: LABELS.ARIA_FLUSH_ERROR,
    action: flushErrors,
  },
  {
    navKey: 'FLUSH_NETWORK_TRAFFIC_BUTTON',
    label: LABELS.BTN_FLUSH_NETWORK,
    ariaLabel: LABELS.ARIA_FLUSH_NETWORK_TRAFFIC,
    action: flushNetworkTraffic,
  },
];

export const getFlushLabel = (label: string) =>
  `(Flushed ${label} at ${new Date().toLocaleTimeString()})`;
