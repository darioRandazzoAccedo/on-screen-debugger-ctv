import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { vKey, type Key } from '@accedo/xdk-virtual-key';
import { environment as env } from '@accedo/xdk-core';

import { useDeviceListener, useLatest, useEvent } from './hooks';
import { focusManager } from './navigation';
import { DEBUG_UI_MODAL } from './navigatioMap';
import {
  useOnScreenDebuggerStore,
  type LogEntry,
  type DebugModalVisibility,
} from './store/onScreenDebuggerStore';
import { getLabelForSequence, SEQUENCE_ENABLE_DISABLE_DEBUG_UI } from './hooks/useOnScreenDebugger';
import useToggleDebugModal from './hooks/useToggleDebugModal';
import useUpdateScroll from './hooks/useUpdateScroll';
import FocusDiv from './components/DebugFocusDiv/DebugFocusDiv';
import styles from './onScreenDebugger.scss';
import { getStatusBarLabel } from './onScreenDebuggerLabels';
import OnScreenDebuggerEntriesList from './OnScreenDebuggerEntriesList';
import OnScreenDebuggerEntryDetails from './OnScreenDebuggerEntryDetails';
import {
  type OnScreenDebuggerFilterOptions,
  type FilterButtonConfig,
  type RecordingButtonConfig,
  ENTRIES_SCROLL_ID,
  TOOLBAR_SCROLL_ID,
  buildNetworkApiFilterButtons,
  filterNetworkTraffic,
  filterNetworkTrafficByUrl,
  createNavMap,
} from './onScreenDebuggerUtils';
import OnScreenDebuggerToolbar from './OnScreenDebuggerToolbar';

// IMPORTANT: do not use console.log or similar inside here,
// this could cause weird UI bugs because a log (and similar) will
// add an entry that this component will render, so better to avoid it
// especially in places that can be caused by rendering events (e.g. onFocus, etc).
// If you need to log anything, use instead `(window.console as any).originalLog` and similar.

const REFRESH_INTERVAL = 2000;

const INITIAL_FILTER_COUNTS: Record<string, number> = {
  logs: 0,
  debug: 0,
  info: 0,
  warn: 0,
  errors: 0,
  all_terminal: 0,
  fetch_xhr: 0,
  other_network: 0,
  all_network: 0,
  all_analytics: 0,
};

const FIXED_DEBUGGER_FILTERS = new Set<string>([
  'logs',
  'debug',
  'info',
  'warn',
  'errors',
  'all_terminal',
  'fetch_xhr',
  'other_network',
  'all_network',
  'all_analytics',
]);

const OnScreenDebugger = () => {
  const [flushFeedbackLabel, setFlushFeedbackLabel] = useState('');
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>(() => ({
    ...INITIAL_FILTER_COUNTS,
  }));
  const [autoRefreshFlag, setAutoRefreshFlag] = useState<boolean>(true);
  const [autoFocusToNewEntry, setAutoFocusToNewEntry] = useState<boolean>(false);
  const autoFocusToNewEntryRef = useLatest(autoFocusToNewEntry);
  const [debuggerFilter, setDebuggerFilter] =
    useState<OnScreenDebuggerFilterOptions>('all_terminal');
  const [focusingOnDebugEntry, setFocusingOnDebugEntry] = useState<boolean>(false);
  const [selectedDebugEntryDetails, setSelectedDebugEntryDetails] = useState<LogEntry | null>(null);
  const [focusDetailsMode, setFocusDetailsMode] = useState<boolean>(false);
  const focusDetailsModeRef = useLatest(focusDetailsMode);
  const [isDataDetailsSuperExpanded, setIsDataDetailsSuperExpanded] = useState<boolean>(false);
  const isDataDetailsSuperExpandedRef = useLatest(isDataDetailsSuperExpanded);
  const [lastFocusBeforeDetails, setLastFocusBeforeDetails] = useState<string>('');
  const dataDetailsRef = useRef<HTMLDivElement>(null);
  const lastFocusBeforeDetailsRef = useLatest(lastFocusBeforeDetails);
  const prevDebuggerFilterRef = useRef<OnScreenDebuggerFilterOptions>('all_terminal');
  const prevEntryCountRef = useRef<number>(0);
  const debuggerModalVisibility = useOnScreenDebuggerStore(s => s.debugModalVisibility);
  const debuggerModalVisibilityRef = useLatest(debuggerModalVisibility);
  const quickKeySequenceEnabled = useOnScreenDebuggerStore(s => s.quickKeySequence);
  const lastChangeTime = useOnScreenDebuggerStore(s => s.lastChangeTime);
  const { toggleDebugModal } = useToggleDebugModal();
  const logs = useOnScreenDebuggerStore(s => s.log);
  const debugs = useOnScreenDebuggerStore(s => s.debug);
  const infos = useOnScreenDebuggerStore(s => s.info);
  const warns = useOnScreenDebuggerStore(s => s.warn);
  const errors = useOnScreenDebuggerStore(s => s.error);
  const networkTraffic = useOnScreenDebuggerStore(s => s.networkTraffic);
  const networkApiUrlPatterns = useOnScreenDebuggerStore(s => s.networkApiUrlPatterns);

  const recordLog = useOnScreenDebuggerStore(s => s.recordLog);
  const recordDebug = useOnScreenDebuggerStore(s => s.recordDebug);
  const recordInfo = useOnScreenDebuggerStore(s => s.recordInfo);
  const recordWarn = useOnScreenDebuggerStore(s => s.recordWarn);
  const recordError = useOnScreenDebuggerStore(s => s.recordError);
  const recordNetworkTraffic = useOnScreenDebuggerStore(s => s.recordNetworkTraffic);

  const recordingFlags: Record<RecordingButtonConfig['selectorKey'], boolean> = {
    recordLog,
    recordDebug,
    recordInfo,
    recordWarn,
    recordError,
    recordNetworkTraffic,
  };

  const lastFocusRef = useRef('');
  const updateScroll = useUpdateScroll(ENTRIES_SCROLL_ID);
  const updateToolbarScroll = useUpdateScroll(TOOLBAR_SCROLL_ID);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const lastEntryRef = useRef<LogEntry | null>(null);

  const sequenceLabel = SEQUENCE_ENABLE_DISABLE_DEBUG_UI.map(k => getLabelForSequence(k.id)).join(
    ' '
  );

  const changeFocusWrap = useCallback((value: string) => {
    if (debuggerModalVisibilityRef.current === 'focusable') {
      focusManager.changeFocus(value);

      return;
    }

    (window.console as any)?.warn(
      'OnScreenDebugger - trying to set focus when not focusable or hidden ',
      value
    );
  }, []);

  useEffect(() => {
    if (focusDetailsMode) {
      setLastFocusBeforeDetails(focusManager.getCurrentFocus());
      changeFocusWrap(DEBUG_UI_MODAL.CONTAINER);
    } else if (focusManager.getCurrentFocus() === DEBUG_UI_MODAL.CONTAINER) {
      changeFocusWrap(lastFocusBeforeDetailsRef.current);
      setLastFocusBeforeDetails('');
    }
  }, [focusDetailsMode]);

  const networkApiFilterButtons: FilterButtonConfig[] = useMemo(
    () => buildNetworkApiFilterButtons(networkApiUrlPatterns),
    [networkApiUrlPatterns]
  );

  const networkApiKeys = useMemo(() => Object.keys(networkApiUrlPatterns), [networkApiUrlPatterns]);

  useEffect(() => {
    const keys = Object.keys(networkApiUrlPatterns);

    if (debuggerFilter === 'all_analytics' && keys.length === 0) {
      setDebuggerFilter('all_terminal');

      return;
    }

    if (
      !FIXED_DEBUGGER_FILTERS.has(String(debuggerFilter)) &&
      !keys.includes(String(debuggerFilter))
    ) {
      setDebuggerFilter('all_terminal');
    }
  }, [networkApiUrlPatterns, debuggerFilter]);

  const updateEntries = useEvent(() => {
    let entriesToUpdate: LogEntry[] = [];

    switch (debuggerFilter) {
      case 'logs': {
        entriesToUpdate = logs;
        break;
      }
      case 'debug': {
        entriesToUpdate = debugs;
        break;
      }
      case 'info': {
        entriesToUpdate = infos;
        break;
      }
      case 'warn': {
        entriesToUpdate = warns;
        break;
      }
      case 'errors': {
        entriesToUpdate = errors;
        break;
      }

      case 'fetch_xhr':
      case 'other_network':
      case 'all_network': {
        entriesToUpdate = filterNetworkTraffic(
          networkTraffic,
          debuggerFilter as 'fetch_xhr' | 'other_network' | 'all_network'
        );
        break;
      }

      case 'all_analytics': {
        entriesToUpdate = filterNetworkTrafficByUrl(
          networkTraffic,
          'all_analytics',
          networkApiUrlPatterns
        );
        break;
      }

      default: {
        if (networkApiUrlPatterns[String(debuggerFilter)] !== undefined) {
          entriesToUpdate = filterNetworkTrafficByUrl(
            networkTraffic,
            String(debuggerFilter),
            networkApiUrlPatterns
          );
          break;
        }

        let all = [...logs, ...debugs, ...infos, ...warns, ...errors];

        all = all.sort((a, b) => a.time - b.time);

        entriesToUpdate = all;
        break;
      }
    }

    const currentCount = entriesToUpdate.length;
    const modeChanged = debuggerFilter !== prevDebuggerFilterRef.current;
    const countChanged = currentCount !== prevEntryCountRef.current;

    // Update entries if the mode changed or if the count for the current type changed
    if (modeChanged || countChanged || entries.length === 0) {
      // clear the entries to avoid focus focus glitches
      // (e.g. skip entries because of lrud cache or similar)
      setEntries([]);
      prevDebuggerFilterRef.current = debuggerFilter;
      prevEntryCountRef.current = currentCount;

      if (autoFocusToNewEntryRef.current && !focusDetailsModeRef.current) {
        const isFocusingOnDebugEntry = focusManager.getCurrentFocus().includes('DEBUG_ENTRY_');

        if (!isFocusingOnDebugEntry) {
          setSelectedDebugEntryDetails(entriesToUpdate?.[entriesToUpdate.length - 1] ?? null);
          window.setTimeout(() => {
            updateScroll(entriesToUpdate?.[entriesToUpdate.length - 1]?.id ?? '');
          }, 100);
        }
      }

      lastEntryRef.current = entriesToUpdate?.[entriesToUpdate.length - 1] ?? null;
      window.requestAnimationFrame(() => {
        setEntries(entriesToUpdate);
      });
    }
  });

  // Calculate counts for filter buttons
  const getFilterCounts = useEvent(() => {
    const allTerminal = [...logs, ...debugs, ...infos, ...warns, ...errors];
    const counts: Record<string, number> = {
      logs: logs.length,
      debug: debugs.length,
      info: infos.length,
      warn: warns.length,
      errors: errors.length,
      all_terminal: allTerminal.length,
      fetch_xhr: filterNetworkTraffic(networkTraffic, 'fetch_xhr').length,
      other_network: filterNetworkTraffic(networkTraffic, 'other_network').length,
      all_network: networkTraffic.length,
      all_analytics: filterNetworkTrafficByUrl(
        networkTraffic,
        'all_analytics',
        networkApiUrlPatterns
      ).length,
    };

    Object.keys(networkApiUrlPatterns).forEach(key => {
      counts[key] = filterNetworkTrafficByUrl(networkTraffic, key, networkApiUrlPatterns).length;
    });

    return counts;
  });

  const nav = useMemo(() => createNavMap(entries, networkApiKeys), [entries, networkApiKeys]);

  const triggerEntriesUpdate = useEvent(() => {
    updateEntries();
    setFilterCounts(getFilterCounts());
  });

  useEffect(() => {
    let interval = -1;

    triggerEntriesUpdate();

    if (autoRefreshFlag) {
      interval = window.setInterval(() => {
        triggerEntriesUpdate();
      }, REFRESH_INTERVAL);
    }

    return () => {
      window.clearInterval(interval);
    };
  }, [autoRefreshFlag]);

  useEffect(() => {
    triggerEntriesUpdate();
  }, [networkApiUrlPatterns, triggerEntriesUpdate]);

  const renderContentDataDetails = useMemo(() => {
    return (
      focusingOnDebugEntry ||
      (autoFocusToNewEntry && debuggerModalVisibility === 'not-focusable') ||
      lastFocusBeforeDetails !== ''
    );
  }, [focusingOnDebugEntry, autoFocusToNewEntry, debuggerModalVisibility, lastFocusBeforeDetails]);

  const restoreFocusToMainApp = useCallback(
    (nextModalVisibility: DebugModalVisibility) => {
      changeFocusWrap(lastFocusRef.current);
      toggleDebugModal(nextModalVisibility);
    },
    [changeFocusWrap, toggleDebugModal]
  );

  const handleFocusMainApp = useCallback(() => {
    window.requestAnimationFrame(() => {
      restoreFocusToMainApp('not-focusable');
    });
  }, [restoreFocusToMainApp]);

  const handleCloseDebugModal = useCallback(() => {
    window.requestAnimationFrame(() => {
      restoreFocusToMainApp('hidden');
    });
  }, [restoreFocusToMainApp]);

  const handleDisableDebugModal = useCallback(() => {
    window.requestAnimationFrame(() => {
      restoreFocusToMainApp('hidden');
      window.requestAnimationFrame(() => {
        useOnScreenDebuggerStore.getState().setOnScreenDebuggerEnabledPersistent('off');
      });
    });
  }, [restoreFocusToMainApp]);

  const handleFocusChange = useCallback(({ id }: { id: string }) => {
    const focusingOnDebugEntryToCheck = id.includes('DEBUG_ENTRY_');

    setFocusingOnDebugEntry(focusingOnDebugEntryToCheck);
  }, []);

  useEffect(() => {
    if (debuggerModalVisibility !== 'focusable') {
      return;
    }

    focusManager.listenToFocusChanged(handleFocusChange);

    return () => {
      focusManager.unlistenToFocusChanged(handleFocusChange);
    };
  }, [debuggerModalVisibility, handleFocusChange]);

  const handleBackClick = useCallback(() => {
    if (debuggerModalVisibilityRef.current !== 'focusable') {
      return;
    }
    // IMPORTANT: no need to check canListenToKeyEvents, because this is a special component
    // that overrides normal app behaviors

    if (isDataDetailsSuperExpandedRef.current) {
      setIsDataDetailsSuperExpanded(false);
      setFocusDetailsMode(true);

      return;
    }

    if (focusDetailsModeRef.current) {
      setFocusDetailsMode(false);

      return;
    }

    const currentFocus = focusManager.getCurrentFocus();
    const isFocusOnDebugEntry = currentFocus.includes('DEBUG_ENTRY_');
    const isFocusOnReturnToMainAppButton = currentFocus.includes(
      DEBUG_UI_MODAL.FOCUS_MAIN_APP_BUTTON
    );

    if (!isFocusOnDebugEntry && currentFocus !== DEBUG_UI_MODAL.FOCUS_MAIN_APP_BUTTON) {
      changeFocusWrap(DEBUG_UI_MODAL.FOCUS_MAIN_APP_BUTTON);

      return;
    }

    const validLastFocusBeforeDetails = lastFocusBeforeDetailsRef.current !== '';

    if (isFocusOnReturnToMainAppButton) {
      handleFocusMainApp();
    } else if (isFocusOnDebugEntry) {
      changeFocusWrap(DEBUG_UI_MODAL.FOCUS_MAIN_APP_BUTTON);
    } else if (validLastFocusBeforeDetails) {
      changeFocusWrap(lastFocusBeforeDetailsRef.current);
      setLastFocusBeforeDetails('');
      setFocusDetailsMode(false);
      setIsDataDetailsSuperExpanded(false);
    } else {
      changeFocusWrap(DEBUG_UI_MODAL.FOCUS_MAIN_APP_BUTTON);
    }
  }, [changeFocusWrap, handleFocusMainApp]);

  const handleKeydown = useCallback((id: string) => {
    if (!focusDetailsModeRef.current) {
      return;
    }

    try {
      switch (id) {
        case vKey.OK.id: {
          if (focusDetailsModeRef.current) {
            setIsDataDetailsSuperExpanded(prev => !prev);
          }

          break;
        }
        case vKey.UP.id: {
          if (dataDetailsRef.current) {
            dataDetailsRef.current.scrollTop -= 100;
          }

          break;
        }
        case vKey.DOWN.id: {
          if (dataDetailsRef.current) {
            dataDetailsRef.current.scrollTop += 100;
          }

          break;
        }
        case vKey.LEFT.id: {
          if (dataDetailsRef.current) {
            dataDetailsRef.current.scrollLeft -= 100;
          }

          break;
        }
        case vKey.RIGHT.id: {
          if (dataDetailsRef.current) {
            dataDetailsRef.current.scrollLeft += 100;
          }

          break;
        }

        default: {
          break;
        }
      }
    } catch {
      // Silently handle scroll errors in debug tool
    }
  }, []);

  useDeviceListener<Key>(env.SYSTEM.KEYDOWN, ({ id }) => {
    if (id === vKey.BACK.id) {
      handleBackClick();
    } else if (
      id === vKey.OK.id ||
      id === vKey.UP.id ||
      id === vKey.DOWN.id ||
      id === vKey.LEFT.id ||
      id === vKey.RIGHT.id
    ) {
      handleKeydown(id);
    }
  });

  useEffect(() => {
    if (debuggerModalVisibility !== 'focusable') {
      return;
    }

    lastFocusRef.current = focusManager.getCurrentFocus();

    // IMPORTANT: only safe place to actually use focusManager.changeFocus
    // because it's when debuggerModalVisibility gets focusable
    focusManager.changeFocus(
      autoFocusToNewEntryRef.current && lastEntryRef.current?.id
        ? lastEntryRef.current?.id
        : DEBUG_UI_MODAL.FOCUS_MAIN_APP_BUTTON
    );
  }, [debuggerModalVisibility, lastChangeTime]);

  return debuggerModalVisibility === 'focusable' || debuggerModalVisibility === 'not-focusable' ? (
    <FocusDiv nav={nav.MODAL_CONTAINER} className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalAdminUi}>
          <OnScreenDebuggerToolbar
            nav={nav}
            updateToolbarScroll={updateToolbarScroll}
            handleFocusMainApp={handleFocusMainApp}
            handleCloseDebugModal={handleCloseDebugModal}
            handleDisableDebugModal={handleDisableDebugModal}
            autoFocusToNewEntry={autoFocusToNewEntry}
            onToggleAutoFocus={() => setAutoFocusToNewEntry(!autoFocusToNewEntry)}
            autoRefreshFlag={autoRefreshFlag}
            onToggleAutoRefresh={() => setAutoRefreshFlag(!autoRefreshFlag)}
            quickKeySequenceEnabled={quickKeySequenceEnabled}
            sequenceLabel={sequenceLabel}
            recordingFlags={recordingFlags}
            flushFeedbackLabel={flushFeedbackLabel}
            onFlushFeedbackChange={setFlushFeedbackLabel}
            debuggerFilter={debuggerFilter}
            onDebuggerFilterChange={setDebuggerFilter}
            filterCounts={filterCounts}
            networkApiFilterButtons={networkApiFilterButtons}
            showNetworkApiFilters={networkApiKeys.length > 0}
            triggerEntriesUpdate={triggerEntriesUpdate}
          />
        </div>
        <div className={styles.modalDebugModeContent}>
          <div className={styles.modalDebugModeContentWrapper}>
            <div className={styles.modalDebugModeContentTitle} />
            {entries.length > 0 && (
              <div>
                <OnScreenDebuggerEntriesList
                  entriesScrollId={ENTRIES_SCROLL_ID}
                  entries={entries}
                  nav={nav}
                  onEntryFocus={(item, entryNavId) => {
                    setSelectedDebugEntryDetails(item);
                    updateScroll(entryNavId);

                    try {
                      // Reset scroll every time a new entry is focused
                      if (dataDetailsRef.current) {
                        dataDetailsRef.current.scrollTop = 0;
                        dataDetailsRef.current.scrollLeft = 0;
                      }
                    } catch {
                      // Silently handle scroll reset errors in debug tool
                    }
                  }}
                  onEntryClick={() => {
                    setFocusDetailsMode(true);
                  }}
                />
                {renderContentDataDetails && (
                  <div
                    className={classNames(styles.modalDebugModeContentDataDetails, {
                      [styles.modalDebugModeContentDataDetailsFocused]: focusDetailsMode,
                      [styles.modalDebugModeContentDataDetailsSuperExpanded]:
                        isDataDetailsSuperExpanded,
                    })}
                    ref={dataDetailsRef}
                  >
                    <OnScreenDebuggerEntryDetails
                      selectedDebugEntryDetails={selectedDebugEntryDetails}
                      debuggerFilter={debuggerFilter}
                      networkApiUrlPatterns={networkApiUrlPatterns}
                    />
                  </div>
                )}

                <div className={styles.modalStatusBar}>
                  {getStatusBarLabel(
                    debuggerModalVisibility,
                    renderContentDataDetails,
                    focusDetailsMode,
                    isDataDetailsSuperExpanded,
                    sequenceLabel,
                    quickKeySequenceEnabled
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FocusDiv>
  ) : null;
};

export default OnScreenDebugger;
