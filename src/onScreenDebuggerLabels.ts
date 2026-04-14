export const LABELS = {
  // Page title
  TITLE: '<<< On-Screen Debugger >>>',

  // Section headings
  SECTION_RETURN: 'Return to Main App Options',
  SECTION_SETTINGS: 'Settings',
  SECTION_RECORDING: 'Recording Status',
  SECTION_FLUSH: 'Flush',
  SECTION_FILTER_TERMINAL: 'Filter by Terminal',
  SECTION_FILTER_NETWORK_TYPE: 'Filter by Network Type',
  SECTION_FILTER_NETWORK_API: 'Filter by Network API',

  // Section descriptions
  DESC_RETURN: 'Choose how this tool should behave after returning to the main app.',
  DESC_SETTINGS: 'Other tool settings.',
  DESC_RECORDING: 'Select what kind of traffic needs to be catched. ',
  DESC_FLUSH: 'Flush currently recorded entries by type.',
  DESC_FILTER_TERMINAL: 'Show traffic based on its Terminal type.',
  DESC_FILTER_NETWORK_TYPE: 'Show traffic based on its Network type.',
  DESC_FILTER_NETWORK_API: 'Show traffic based on its Network API.',

  // Return to Main App buttons
  BTN_RETURN_KEEP: 'Return & Keep Tool Open',
  BTN_RETURN_HIDE: 'Return & Hide Tool',
  BTN_RETURN_DISABLE: 'Return & Disable Tool',

  // Settings buttons (static parts)
  BTN_AUTO_DETAILS_FOCUS: 'Auto Details Focus',
  BTN_AUTO_REFRESH: 'Auto Refresh',
  BTN_INVOKE_TOOL_SEQUENCE: 'Invoke Tool Sequence',

  // Recording status buttons
  BTN_RECORD_LOG: 'log',
  BTN_RECORD_DEBUG: 'debug',
  BTN_RECORD_INFO: 'info',
  BTN_RECORD_WARN: 'warn',
  BTN_RECORD_ERROR: 'error',
  BTN_RECORD_NETWORK: 'networkTraffic',

  // Flush buttons
  BTN_FLUSH_LOG: 'log',
  BTN_FLUSH_DEBUG: 'debug',
  BTN_FLUSH_INFO: 'info',
  BTN_FLUSH_WARN: 'warn',
  BTN_FLUSH_ERROR: 'error',
  BTN_FLUSH_NETWORK: 'networkTraffic',

  // Filter by Terminal buttons (base names)
  BTN_FILTER_LOGS: 'logs',
  BTN_FILTER_DEBUG: 'debug',
  BTN_FILTER_INFO: 'info',
  BTN_FILTER_WARN: 'warn',
  BTN_FILTER_ERRORS: 'errors',
  BTN_FILTER_ALL_TERMINAL: 'all',

  // Filter by Network Type buttons (base names)
  BTN_FILTER_FETCH_XHR: 'fetch-xhr',
  BTN_FILTER_OTHER_NETWORK: 'other',
  BTN_FILTER_ALL_NETWORK: 'all',

  // Filter by Network API buttons (base names)
  BTN_FILTER_DAL: 'dal',
  BTN_FILTER_SAS: 'sas',
  BTN_FILTER_LOGSTASH: 'logstash',
  BTN_FILTER_ALL_ANALYTICS: 'all analytics',

  // Detail section prefixes
  DETAIL_URL: 'URL: ',
  DETAIL_OPTIONS: 'Options: ',
  DETAIL_RESPONSE: 'Response: ',

  // Misc
  PRESS_BACK_TO_RETURN_MENU:
    'PRESS BACK TO RETURN TO THE (HIDDEN) MENU ABOVE, PRESS ENTER TO FOCUS DETAILS',
  PRESS_BACK_TO_RETURN_ENTRIES:
    'PRESS BACK TO FOCUS AGAIN THE ENTRIES LIST, PRESS ENTER TO EXPAND DETAILS',
  PRESS_BACK_TO_RETURN_NORMAL_VIEW: 'PRESS ENTER OR BACK TO RETURN TO THE NORMAL VIEW',
  PRESS_SEQUENCE_TO_FOCUS_TOOL: 'PRESS [<sequence>] TO FOCUS THE TOOL',
  FOCUS_TOOL: 'GO TO USER PAGE (MY GEM) > DEV OPTIONS > FOCUS TOOL',
  SCROLL_DOWN_TO_VIEW_ENTRIES: 'SCROLL DOWN TO VIEW ENTRIES',

  // Aria labels
  ARIA_FOCUS_MAIN_APP: 'Focus Main App',
  ARIA_QUIT_DEBUGGER: 'Quit Debugger',
  ARIA_SWITCH_DEBUG_VIEW: 'Switch Debug view',
  ARIA_AUTO_DETAILS_FOCUS: 'Auto Details Focus',
  ARIA_AUTO_REFRESH: 'Auto Refresh',
  ARIA_QUICK_KEY_SEQUENCE: 'Quick Key Sequence',
  ARIA_RECORD_LOG: 'Record Log',
  ARIA_RECORD_DEBUG: 'Record Debug',
  ARIA_RECORD_INFO: 'Record Info',
  ARIA_RECORD_WARN: 'Record Warn',
  ARIA_RECORD_ERROR: 'Record Error',
  ARIA_RECORD_NETWORK_TRAFFIC: 'Record Network Traffic',
  ARIA_FLUSH_LOG: 'Flush Log',
  ARIA_FLUSH_DEBUG: 'Flush Debug',
  ARIA_FLUSH_INFO: 'Flush Info',
  ARIA_FLUSH_WARN: 'Flush Warn',
  ARIA_FLUSH_ERROR: 'Flush Error',
  ARIA_FLUSH_NETWORK_TRAFFIC: 'Flush Network Traffic',
  ARIA_FILTER_LOGS: 'Logs',
  ARIA_FILTER_DEBUG: 'Debug',
  ARIA_FILTER_INFO: 'Info',
  ARIA_FILTER_WARN: 'Warn',
  ARIA_FILTER_ERRORS: 'Errors',
  ARIA_FILTER_ALL: 'All',
  ARIA_FILTER_FETCH_XHR: 'Fetch XHR',
  ARIA_FILTER_OTHER_NETWORK: 'Other Network',
  ARIA_FILTER_ALL_NETWORK: 'All Network',
  ARIA_FILTER_DAL: 'DAL',
  ARIA_FILTER_SAS: 'SAS',
  ARIA_FILTER_LOGSTASH: 'Logstash',
  ARIA_FILTER_ALL_ANALYTICS: 'All Analytics',
} as const;

export const getAutoDetailsFocusLabel = (isOn: boolean) =>
  `${LABELS.BTN_AUTO_DETAILS_FOCUS} ${isOn ? '(ON)' : '(OFF)'}`;

export const getAutoRefreshLabel = (isOn: boolean) =>
  `${LABELS.BTN_AUTO_REFRESH} ${isOn ? '(ON)' : '(OFF)'}`;

export const getQuickKeySequenceLabel = (sequence: string, isOn: boolean) =>
  `${LABELS.BTN_INVOKE_TOOL_SEQUENCE} [${sequence}] ${isOn ? '(ON)' : '(OFF)'}`;

export const getFilterCountLabel = (name: string, count: number) => `${name} (${count})`;

export const getDebugEntryAriaLabel = (index: number) => `Debug entry ${index + 1}`;

export const getStatusBarLabel = (
  debugModalVisibility: 'hidden' | 'not-focusable' | 'focusable',
  renderContentDataDetails: boolean,
  focusDetailsMode: boolean,
  isDataDetailsSuperExpanded: boolean,
  sequenceLabel: string,
  quickKeySequenceEnabled: boolean
): string => {
  if (debugModalVisibility === 'not-focusable' && quickKeySequenceEnabled) {
    return LABELS.PRESS_SEQUENCE_TO_FOCUS_TOOL.replace('<sequence>', sequenceLabel);
  }

  if (debugModalVisibility === 'not-focusable' && !quickKeySequenceEnabled) {
    return LABELS.FOCUS_TOOL;
  }

  if (
    debugModalVisibility === 'focusable' &&
    renderContentDataDetails &&
    isDataDetailsSuperExpanded
  ) {
    return LABELS.PRESS_BACK_TO_RETURN_NORMAL_VIEW;
  }

  if (debugModalVisibility === 'focusable' && renderContentDataDetails && focusDetailsMode) {
    return LABELS.PRESS_BACK_TO_RETURN_ENTRIES;
  }

  if (debugModalVisibility === 'focusable' && renderContentDataDetails && !focusDetailsMode) {
    return LABELS.PRESS_BACK_TO_RETURN_MENU;
  }

  if (debugModalVisibility === 'focusable' && !renderContentDataDetails) {
    return LABELS.SCROLL_DOWN_TO_VIEW_ENTRIES;
  }

  return '';
};
