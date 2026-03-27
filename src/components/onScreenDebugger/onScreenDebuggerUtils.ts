import type { LogEntry, OnScreenDebuggerMode } from '../../store/debuggerStore';
import { debuggerStore } from '../../store/debuggerStore';
import { LABELS } from './onScreenDebuggerLabels';

// ============================================================================
// Navigation IDs
// ============================================================================

export const NAV = {
  CONTAINER: 'DEBUG_UI_MODAL_CONTAINER',
  QUICK_ACTIONS_CONTAINER: 'DEBUG_UI_MODAL_QUICK_ACTIONS_CONTAINER',
  DEBUG_MODE_CONTAINER: 'DEBUG_UI_MODAL_DEBUG_MODE_CONTAINER',
  DEBUG_MODE_NETWORK_CONTAINER: 'DEBUG_UI_MODAL_DEBUG_MODE_NETWORK_CONTAINER',
  DEBUG_MODE_NETWORK_API_CONTAINER:
    'DEBUG_UI_MODAL_DEBUG_MODE_NETWORK_API_CONTAINER',
  FOCUS_MAIN_APP_BUTTON: 'DEBUG_UI_MODAL_FOCUS_MAIN_APP_BUTTON',
  AUTO_SCROLL_TO_NEW_ENTRY_BUTTON:
    'DEBUG_UI_MODAL_AUTO_SCROLL_TO_NEW_ENTRY_BUTTON',
  QUIT_DEBUGGER_BUTTON: 'DEBUG_UI_MODAL_QUIT_DEBUGGER_BUTTON',
  SWITCH_DEBUG_VIEW_BUTTON: 'DEBUG_UI_MODAL_SWITCH_DEBUG_VIEW_BUTTON',
  DEBUG_MODE_LOGS_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_LOGS_BUTTON',
  DEBUG_MODE_DEBUG_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_DEBUG_BUTTON',
  DEBUG_MODE_INFO_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_INFO_BUTTON',
  DEBUG_MODE_WARN_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_WARN_BUTTON',
  DEBUG_MODE_ERRORS_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_ERRORS_BUTTON',
  DEBUG_MODE_ALL_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_ALL_BUTTON',
  DEBUG_MODE_FETCH_XHR_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_FETCH_XHR_BUTTON',
  DEBUG_MODE_OTHER_NETWORK_BUTTON:
    'DEBUG_UI_MODAL_DEBUG_MODE_OTHER_NETWORK_BUTTON',
  DEBUG_MODE_ALL_NETWORK_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_ALL_NETWORK_BUTTON',
  DEBUG_MODE_DAL_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_DAL_BUTTON',
  DEBUG_MODE_SAS_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_SAS_BUTTON',
  DEBUG_MODE_LOGSTASH_BUTTON: 'DEBUG_UI_MODAL_DEBUG_MODE_LOGSTASH_BUTTON',
  DEBUG_MODE_ALL_ANALYTICS_BUTTON:
    'DEBUG_UI_MODAL_DEBUG_MODE_ALL_ANALYTICS_BUTTON',
  DEBUG_MODE_ENTRIES_LIST: 'DEBUG_UI_MODAL_DEBUG_MODE_ENTRIES_LIST',
  SETTINGS_CONTAINER: 'DEBUG_UI_MODAL_SETTINGS_CONTAINER',
  QUICK_KEY_SEQUENCE_BUTTON: 'DEBUG_UI_MODAL_QUICK_KEY_SEQUENCE_BUTTON',
  RECORDING_STATUS_CONTAINER: 'DEBUG_UI_MODAL_RECORDING_STATUS_CONTAINER',
  RECORD_LOG_BUTTON: 'DEBUG_UI_MODAL_RECORD_LOG_BUTTON',
  RECORD_DEBUG_BUTTON: 'DEBUG_UI_MODAL_RECORD_DEBUG_BUTTON',
  RECORD_INFO_BUTTON: 'DEBUG_UI_MODAL_RECORD_INFO_BUTTON',
  RECORD_WARN_BUTTON: 'DEBUG_UI_MODAL_RECORD_WARN_BUTTON',
  RECORD_ERROR_BUTTON: 'DEBUG_UI_MODAL_RECORD_ERROR_BUTTON',
  RECORD_NETWORK_TRAFFIC_BUTTON: 'DEBUG_UI_MODAL_RECORD_NETWORK_TRAFFIC_BUTTON',
  FLUSH_CONTAINER: 'DEBUG_UI_MODAL_FLUSH_CONTAINER',
  FLUSH_LOG_BUTTON: 'DEBUG_UI_MODAL_FLUSH_LOG_BUTTON',
  FLUSH_DEBUG_BUTTON: 'DEBUG_UI_MODAL_FLUSH_DEBUG_BUTTON',
  FLUSH_INFO_BUTTON: 'DEBUG_UI_MODAL_FLUSH_INFO_BUTTON',
  FLUSH_WARN_BUTTON: 'DEBUG_UI_MODAL_FLUSH_WARN_BUTTON',
  FLUSH_ERROR_BUTTON: 'DEBUG_UI_MODAL_FLUSH_ERROR_BUTTON',
  FLUSH_NETWORK_TRAFFIC_BUTTON: 'DEBUG_UI_MODAL_FLUSH_NETWORK_TRAFFIC_BUTTON',
} as const;

// ============================================================================
// Types
// ============================================================================

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
  | 'dal'
  | 'sas'
  | 'logstash'
  | 'all_analytics';

export type FilterButtonConfig = {
  mode: OnScreenDebuggerFilterOptions;
  navKey: keyof typeof NAV;
  label: string;
  ariaLabel: string;
};

export type RecordingButtonConfig = {
  navKey: keyof typeof NAV;
  label: string;
  ariaLabel: string;
  selectorKey:
    | 'recordLog'
    | 'recordDebug'
    | 'recordInfo'
    | 'recordWarn'
    | 'recordError'
    | 'recordNetworkTraffic';
  /** Action function from debuggerStore that toggles recording */
  action: (value: boolean) => void;
};

export type FlushButtonConfig = {
  navKey: keyof typeof NAV;
  label: string;
  ariaLabel: string;
  action: () => void;
};

// ============================================================================
// Constants
// ============================================================================

export const HALF_HEIGHT_MODAL = 500;
export const ENTRIES_SCROLL_ID = 'debug-ui-modal-entries';
export const TOOLBAR_SCROLL_ID = 'debug-ui-modal-toolbar';

const NETWORK_FILTERS: OnScreenDebuggerFilterOptions[] = [
  'fetch_xhr',
  'other_network',
  'all_network',
  'dal',
  'sas',
  'logstash',
  'all_analytics',
];

// ============================================================================
// Pure functions
// ============================================================================

export const isNetworkFilters = (
  filt: OnScreenDebuggerFilterOptions,
): boolean => NETWORK_FILTERS.includes(filt);

export const safeJsonParse = (
  value: string,
  fallback: unknown = {},
): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const isFetchOrXhr = (entry: LogEntry): boolean => {
  const performanceHeader =
    entry.extraParams?.networkTraffic?.options?.headers?.['x-performance'];

  if (performanceHeader) {
    try {
      const performanceInfo = JSON.parse(performanceHeader);
      const initiatorType = performanceInfo?.initiatorType;

      return initiatorType === 'fetch' || initiatorType === 'xmlhttprequest';
    } catch {
      return (performanceHeader as string).includes('fetch');
    }
  }

  return true;
};

export const filterNetworkTraffic = (
  entries: LogEntry[],
  filterType: 'fetch_xhr' | 'other_network' | 'all_network',
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

export const filterNetworkTrafficByUrl = (
  entries: LogEntry[],
  filterType: 'dal' | 'sas' | 'logstash' | 'all_analytics',
): LogEntry[] => {
  const urlPatterns: Record<'dal' | 'sas' | 'logstash', string> = {
    dal: 'dal.data.cbc.ca',
    sas: 'cbc.ca/sas',
    logstash: 'logstash-4.radio-canada.ca',
  };

  if (filterType === 'all_analytics') {
    const allPatterns = Object.values(urlPatterns);

    return entries.filter(entry => {
      const url = entry.extraParams?.networkTraffic?.url ?? '';

      return allPatterns.some(pattern => url.includes(pattern));
    });
  }

  const pattern = urlPatterns[filterType];

  return entries.filter(entry => {
    const url = entry.extraParams?.networkTraffic?.url ?? '';

    return url.includes(pattern);
  });
};

// ============================================================================
// Nav map
// ============================================================================

const mapDebugEntries = (
  entries: LogEntry[],
): Record<string, { id: string; parent: string }> => {
  const entriesNav: Record<string, { id: string; parent: string }> = {};

  entries.forEach(entry => {
    entriesNav[entry.id] = {
      id: entry.id,
      parent: NAV.DEBUG_MODE_ENTRIES_LIST,
    };
  });

  return entriesNav;
};

export const createNavMap = (entries: LogEntry[]) => {
  const entriesNav = mapDebugEntries(entries);
  const entryKeys = Object.keys(entriesNav);
  const lastEntryId = entryKeys[entryKeys.length - 1];

  return {
    MODAL_CONTAINER: { id: NAV.CONTAINER, orientation: 'vertical' as const },
    QUICK_ACTIONS_CONTAINER: {
      id: NAV.QUICK_ACTIONS_CONTAINER,
      parent: NAV.CONTAINER,
      orientation: 'horizontal' as const,
    },
    SETTINGS_CONTAINER: {
      id: NAV.SETTINGS_CONTAINER,
      parent: NAV.CONTAINER,
      orientation: 'horizontal' as const,
    },
    DEBUG_MODE_CONTAINER: {
      id: NAV.DEBUG_MODE_CONTAINER,
      parent: NAV.CONTAINER,
      orientation: 'horizontal' as const,
    },
    DEBUG_MODE_NETWORK_CONTAINER: {
      id: NAV.DEBUG_MODE_NETWORK_CONTAINER,
      parent: NAV.CONTAINER,
      orientation: 'horizontal' as const,
    },
    DEBUG_MODE_NETWORK_API_CONTAINER: {
      id: NAV.DEBUG_MODE_NETWORK_API_CONTAINER,
      parent: NAV.CONTAINER,
      orientation: 'horizontal' as const,
    },
    DEBUG_MODE_ENTRIES_LIST: {
      id: NAV.DEBUG_MODE_ENTRIES_LIST,
      parent: NAV.CONTAINER,
      orientation: 'vertical' as const,
      forwardFocus: lastEntryId ?? '',
    },
    FOCUS_MAIN_APP_BUTTON: {
      id: NAV.FOCUS_MAIN_APP_BUTTON,
      parent: NAV.QUICK_ACTIONS_CONTAINER,
    },
    AUTO_SCROLL_TO_NEW_ENTRY_BUTTON: {
      id: NAV.AUTO_SCROLL_TO_NEW_ENTRY_BUTTON,
      parent: NAV.SETTINGS_CONTAINER,
    },
    QUICK_KEY_SEQUENCE_BUTTON: {
      id: NAV.QUICK_KEY_SEQUENCE_BUTTON,
      parent: NAV.SETTINGS_CONTAINER,
    },
    QUIT_DEBUGGER_BUTTON: {
      id: NAV.QUIT_DEBUGGER_BUTTON,
      parent: NAV.QUICK_ACTIONS_CONTAINER,
    },
    SWITCH_DEBUG_VIEW_BUTTON: {
      id: NAV.SWITCH_DEBUG_VIEW_BUTTON,
      parent: NAV.QUICK_ACTIONS_CONTAINER,
    },
    DEBUG_MODE_LOGS_BUTTON: {
      id: NAV.DEBUG_MODE_LOGS_BUTTON,
      parent: NAV.DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_DEBUG_BUTTON: {
      id: NAV.DEBUG_MODE_DEBUG_BUTTON,
      parent: NAV.DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_INFO_BUTTON: {
      id: NAV.DEBUG_MODE_INFO_BUTTON,
      parent: NAV.DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_WARN_BUTTON: {
      id: NAV.DEBUG_MODE_WARN_BUTTON,
      parent: NAV.DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_ERRORS_BUTTON: {
      id: NAV.DEBUG_MODE_ERRORS_BUTTON,
      parent: NAV.DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_ALL_BUTTON: {
      id: NAV.DEBUG_MODE_ALL_BUTTON,
      parent: NAV.DEBUG_MODE_CONTAINER,
    },
    DEBUG_MODE_FETCH_XHR_BUTTON: {
      id: NAV.DEBUG_MODE_FETCH_XHR_BUTTON,
      parent: NAV.DEBUG_MODE_NETWORK_CONTAINER,
    },
    DEBUG_MODE_OTHER_NETWORK_BUTTON: {
      id: NAV.DEBUG_MODE_OTHER_NETWORK_BUTTON,
      parent: NAV.DEBUG_MODE_NETWORK_CONTAINER,
    },
    DEBUG_MODE_ALL_NETWORK_BUTTON: {
      id: NAV.DEBUG_MODE_ALL_NETWORK_BUTTON,
      parent: NAV.DEBUG_MODE_NETWORK_CONTAINER,
    },
    DEBUG_MODE_DAL_BUTTON: {
      id: NAV.DEBUG_MODE_DAL_BUTTON,
      parent: NAV.DEBUG_MODE_NETWORK_API_CONTAINER,
    },
    DEBUG_MODE_SAS_BUTTON: {
      id: NAV.DEBUG_MODE_SAS_BUTTON,
      parent: NAV.DEBUG_MODE_NETWORK_API_CONTAINER,
    },
    DEBUG_MODE_LOGSTASH_BUTTON: {
      id: NAV.DEBUG_MODE_LOGSTASH_BUTTON,
      parent: NAV.DEBUG_MODE_NETWORK_API_CONTAINER,
    },
    DEBUG_MODE_ALL_ANALYTICS_BUTTON: {
      id: NAV.DEBUG_MODE_ALL_ANALYTICS_BUTTON,
      parent: NAV.DEBUG_MODE_NETWORK_API_CONTAINER,
    },
    RECORDING_STATUS_CONTAINER: {
      id: NAV.RECORDING_STATUS_CONTAINER,
      parent: NAV.CONTAINER,
      orientation: 'horizontal' as const,
    },
    RECORD_LOG_BUTTON: {
      id: NAV.RECORD_LOG_BUTTON,
      parent: NAV.RECORDING_STATUS_CONTAINER,
    },
    RECORD_DEBUG_BUTTON: {
      id: NAV.RECORD_DEBUG_BUTTON,
      parent: NAV.RECORDING_STATUS_CONTAINER,
    },
    RECORD_INFO_BUTTON: {
      id: NAV.RECORD_INFO_BUTTON,
      parent: NAV.RECORDING_STATUS_CONTAINER,
    },
    RECORD_WARN_BUTTON: {
      id: NAV.RECORD_WARN_BUTTON,
      parent: NAV.RECORDING_STATUS_CONTAINER,
    },
    RECORD_ERROR_BUTTON: {
      id: NAV.RECORD_ERROR_BUTTON,
      parent: NAV.RECORDING_STATUS_CONTAINER,
    },
    RECORD_NETWORK_TRAFFIC_BUTTON: {
      id: NAV.RECORD_NETWORK_TRAFFIC_BUTTON,
      parent: NAV.RECORDING_STATUS_CONTAINER,
    },
    FLUSH_CONTAINER: {
      id: NAV.FLUSH_CONTAINER,
      parent: NAV.CONTAINER,
      orientation: 'horizontal' as const,
    },
    FLUSH_LOG_BUTTON: { id: NAV.FLUSH_LOG_BUTTON, parent: NAV.FLUSH_CONTAINER },
    FLUSH_DEBUG_BUTTON: {
      id: NAV.FLUSH_DEBUG_BUTTON,
      parent: NAV.FLUSH_CONTAINER,
    },
    FLUSH_INFO_BUTTON: {
      id: NAV.FLUSH_INFO_BUTTON,
      parent: NAV.FLUSH_CONTAINER,
    },
    FLUSH_WARN_BUTTON: {
      id: NAV.FLUSH_WARN_BUTTON,
      parent: NAV.FLUSH_CONTAINER,
    },
    FLUSH_ERROR_BUTTON: {
      id: NAV.FLUSH_ERROR_BUTTON,
      parent: NAV.FLUSH_CONTAINER,
    },
    FLUSH_NETWORK_TRAFFIC_BUTTON: {
      id: NAV.FLUSH_NETWORK_TRAFFIC_BUTTON,
      parent: NAV.FLUSH_CONTAINER,
    },
    ...entriesNav,
  };
};

export type NavMap = ReturnType<typeof createNavMap>;

// ============================================================================
// Button config arrays (use debuggerStore actions directly)
// ============================================================================

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

export const NETWORK_API_FILTER_BUTTONS: FilterButtonConfig[] = [
  {
    mode: 'dal',
    navKey: 'DEBUG_MODE_DAL_BUTTON',
    label: LABELS.BTN_FILTER_DAL,
    ariaLabel: LABELS.ARIA_FILTER_DAL,
  },
  {
    mode: 'sas',
    navKey: 'DEBUG_MODE_SAS_BUTTON',
    label: LABELS.BTN_FILTER_SAS,
    ariaLabel: LABELS.ARIA_FILTER_SAS,
  },
  {
    mode: 'logstash',
    navKey: 'DEBUG_MODE_LOGSTASH_BUTTON',
    label: LABELS.BTN_FILTER_LOGSTASH,
    ariaLabel: LABELS.ARIA_FILTER_LOGSTASH,
  },
  {
    mode: 'all_analytics',
    navKey: 'DEBUG_MODE_ALL_ANALYTICS_BUTTON',
    label: LABELS.BTN_FILTER_ALL_ANALYTICS,
    ariaLabel: LABELS.ARIA_FILTER_ALL_ANALYTICS,
  },
];

const store = debuggerStore.getState;

export const RECORDING_BUTTONS: RecordingButtonConfig[] = [
  {
    navKey: 'RECORD_LOG_BUTTON',
    label: LABELS.BTN_RECORD_LOG,
    ariaLabel: LABELS.ARIA_RECORD_LOG,
    selectorKey: 'recordLog',
    action: v => store().setRecordLog(v),
  },
  {
    navKey: 'RECORD_DEBUG_BUTTON',
    label: LABELS.BTN_RECORD_DEBUG,
    ariaLabel: LABELS.ARIA_RECORD_DEBUG,
    selectorKey: 'recordDebug',
    action: v => store().setRecordDebug(v),
  },
  {
    navKey: 'RECORD_INFO_BUTTON',
    label: LABELS.BTN_RECORD_INFO,
    ariaLabel: LABELS.ARIA_RECORD_INFO,
    selectorKey: 'recordInfo',
    action: v => store().setRecordInfo(v),
  },
  {
    navKey: 'RECORD_WARN_BUTTON',
    label: LABELS.BTN_RECORD_WARN,
    ariaLabel: LABELS.ARIA_RECORD_WARN,
    selectorKey: 'recordWarn',
    action: v => store().setRecordWarn(v),
  },
  {
    navKey: 'RECORD_ERROR_BUTTON',
    label: LABELS.BTN_RECORD_ERROR,
    ariaLabel: LABELS.ARIA_RECORD_ERROR,
    selectorKey: 'recordError',
    action: v => store().setRecordError(v),
  },
  {
    navKey: 'RECORD_NETWORK_TRAFFIC_BUTTON',
    label: LABELS.BTN_RECORD_NETWORK,
    ariaLabel: LABELS.ARIA_RECORD_NETWORK_TRAFFIC,
    selectorKey: 'recordNetworkTraffic',
    action: v => store().setRecordNetworkTraffic(v),
  },
];

export const FLUSH_BUTTONS: FlushButtonConfig[] = [
  {
    navKey: 'FLUSH_LOG_BUTTON',
    label: LABELS.BTN_FLUSH_LOG,
    ariaLabel: LABELS.ARIA_FLUSH_LOG,
    action: () => store().flushLogs(),
  },
  {
    navKey: 'FLUSH_DEBUG_BUTTON',
    label: LABELS.BTN_FLUSH_DEBUG,
    ariaLabel: LABELS.ARIA_FLUSH_DEBUG,
    action: () => store().flushDebugs(),
  },
  {
    navKey: 'FLUSH_INFO_BUTTON',
    label: LABELS.BTN_FLUSH_INFO,
    ariaLabel: LABELS.ARIA_FLUSH_INFO,
    action: () => store().flushInfos(),
  },
  {
    navKey: 'FLUSH_WARN_BUTTON',
    label: LABELS.BTN_FLUSH_WARN,
    ariaLabel: LABELS.ARIA_FLUSH_WARN,
    action: () => store().flushWarns(),
  },
  {
    navKey: 'FLUSH_ERROR_BUTTON',
    label: LABELS.BTN_FLUSH_ERROR,
    ariaLabel: LABELS.ARIA_FLUSH_ERROR,
    action: () => store().flushErrors(),
  },
  {
    navKey: 'FLUSH_NETWORK_TRAFFIC_BUTTON',
    label: LABELS.BTN_FLUSH_NETWORK,
    ariaLabel: LABELS.ARIA_FLUSH_NETWORK_TRAFFIC,
    action: () => store().flushNetworkTraffic(),
  },
];

export const getFlushLabel = (label: string) =>
  `(Flushed ${label} at ${new Date().toLocaleTimeString()})`;

export const getDebuggerMode = (): OnScreenDebuggerMode =>
  debuggerStore.getState().isEnabled;

const VALID_DEBUGGER_MODES: OnScreenDebuggerMode[] = [
  'off',
  'active-on-demand',
  'active-on-start',
];

export function getDebuggerModeFromStorage(
  storageKeyPrefix = 'debugger',
): OnScreenDebuggerMode {
  try {
    const stored = localStorage.getItem(
      `${storageKeyPrefix}_mode`,
    ) as OnScreenDebuggerMode | null;

    if (stored && VALID_DEBUGGER_MODES.includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage may not be available
  }

  return 'off';
}
