import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { vKey, type Key } from '@accedo/xdk-virtual-key';
import { environment as env } from '@accedo/xdk-core';

import { debuggerStore } from '../../store/debuggerStore';
import type {
  LogEntry,
  DebugModalVisibility,
  OnScreenDebuggerMode,
} from '../../store/debuggerStore';
import FocusDiv from '../internal/FocusDiv';
import { NavigationContext } from '../../navigation/NavigationContext';
import type { NavigationAdapter } from '../../navigation/types';
import { useDebuggerScrollUpdate } from '../internal/DebuggerScroll';
import useDeviceListener from '../../hooks/useDeviceListener';
import useLatest from '../../hooks/useLatest';
import useOnScreenDebugger, {
  SEQUENCE_ENABLE_DISABLE_DEBUG_UI,
  getLabelForSequence,
} from '../../hooks/useOnScreenDebugger';
import { initDebuggerFromStorage } from '../../store/debuggerStore';
import styles from './onScreenDebugger.scss';
import { getStatusBarLabel } from './onScreenDebuggerLabels';
import OnScreenDebuggerEntriesList from './OnScreenDebuggerEntriesList';
import OnScreenDebuggerEntryDetails from './OnScreenDebuggerEntryDetails';
import {
  type OnScreenDebuggerFilterOptions,
  type RecordingButtonConfig,
  ENTRIES_SCROLL_ID,
  TOOLBAR_SCROLL_ID,
  NAV,
  filterNetworkTraffic,
  filterNetworkTrafficByUrl,
  createNavMap,
} from './onScreenDebuggerUtils';
import OnScreenDebuggerToolbar from './OnScreenDebuggerToolbar';

// IMPORTANT: do not use console.log or similar inside here.
// Use `(window.console as any).originalLog` if you need to log.

export interface OnScreenDebuggerProps {
  /** Provide your navigation system. Use createLrudAdapter(lrud) for LRUD apps. */
  navigationAdapter: NavigationAdapter;
  /** Called when debug modal visibility changes. Host uses this to block key events and resize app. */
  onVisibilityChange?: (visibility: DebugModalVisibility) => void;
  /** 'off' disables everything. Will be persisted to localStorage. Default: 'active-on-demand'. */
  enabled?: OnScreenDebuggerMode;
  /** localStorage key prefix for persistence (default: 'debugger') */
  storageKeyPrefix?: string;
  /** Set true to disable all debugger functionality (e.g. in production builds). */
  disabled?: boolean;
}

const OnScreenDebuggerInner = ({
  navigationAdapter: adapter,
  onVisibilityChange,
  storageKeyPrefix = 'debugger',
  disabled,
}: Omit<OnScreenDebuggerProps, 'enabled'>) => {
  useOnScreenDebugger(disabled);

  const [flushFeedbackLabel, setFlushFeedbackLabel] = useState('');
  const [autoFocusToNewEntry, setAutoFocusToNewEntry] =
    useState<boolean>(false);
  const autoFocusToNewEntryRef = useLatest(autoFocusToNewEntry);
  const [debuggerFilter, setDebuggerFilter] =
    useState<OnScreenDebuggerFilterOptions>('all_terminal');
  const [focusingOnDebugEntry, setFocusingOnDebugEntry] =
    useState<boolean>(false);
  const [selectedDebugEntryDetails, setSelectedDebugEntryDetails] =
    useState<LogEntry | null>(null);
  const [focusDetailsMode, setFocusDetailsMode] = useState<boolean>(false);
  const focusDetailsModeRef = useLatest(focusDetailsMode);
  const [isDataDetailsSuperExpanded, setIsDataDetailsSuperExpanded] =
    useState<boolean>(false);
  const isDataDetailsSuperExpandedRef = useLatest(isDataDetailsSuperExpanded);
  const [lastFocusBeforeDetails, setLastFocusBeforeDetails] =
    useState<string>('');
  const dataDetailsRef = useRef<HTMLDivElement>(null);
  const lastFocusBeforeDetailsRef = useLatest(lastFocusBeforeDetails);
  const prevDebuggerFilterRef =
    useRef<OnScreenDebuggerFilterOptions>('all_terminal');
  const prevEntryCountRef = useRef<number>(0);

  const debugModalVisibility = debuggerStore(s => s.debugModalVisibility);
  const debugModalVisibilityRef = useLatest(debugModalVisibility);
  const quickKeySequenceEnabled = debuggerStore(s => s.quickKeySequence);
  const lastChangeTime = debuggerStore(s => s.lastChangeTime);
  const logs = debuggerStore(s => s.log);
  const debugs = debuggerStore(s => s.debug);
  const infos = debuggerStore(s => s.info);
  const warns = debuggerStore(s => s.warn);
  const errors = debuggerStore(s => s.error);
  const networkTraffic = debuggerStore(s => s.networkTraffic);
  const recordLog = debuggerStore(s => s.recordLog);
  const recordDebug = debuggerStore(s => s.recordDebug);
  const recordInfo = debuggerStore(s => s.recordInfo);
  const recordWarn = debuggerStore(s => s.recordWarn);
  const recordError = debuggerStore(s => s.recordError);
  const recordNetworkTraffic = debuggerStore(s => s.recordNetworkTraffic);

  const recordingFlags: Record<RecordingButtonConfig['selectorKey'], boolean> =
    {
      recordLog,
      recordDebug,
      recordInfo,
      recordWarn,
      recordError,
      recordNetworkTraffic,
    };

  const lastFocusRef = useRef('');
  const updateScroll = useDebuggerScrollUpdate(ENTRIES_SCROLL_ID);
  const updateToolbarScroll = useDebuggerScrollUpdate(TOOLBAR_SCROLL_ID);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const lastEntryRef = useRef<LogEntry | null>(null);

  const sequenceLabel = SEQUENCE_ENABLE_DISABLE_DEBUG_UI.map(k =>
    getLabelForSequence(k.id),
  ).join(' ');

  // Notify host when visibility changes
  useEffect(() => {
    onVisibilityChange?.(debugModalVisibility);
  }, [debugModalVisibility, onVisibilityChange]);

  const changeFocusWrap = useCallback(
    (value: string) => {
      if (debugModalVisibilityRef.current === 'focusable') {
        adapter.assignFocus(value);

        return;
      }

      (
        window.console as unknown as Record<
          string,
          (...args: unknown[]) => void
        >
      )?.warn?.(
        'OnScreenDebugger - trying to set focus when not focusable or hidden',
        value,
      );
    },
    [adapter],
  );

  useEffect(() => {
    if (focusDetailsMode) {
      setLastFocusBeforeDetails(adapter.getCurrentFocusId());
      changeFocusWrap(NAV.CONTAINER);
    } else if (adapter.getCurrentFocusId() === NAV.CONTAINER) {
      changeFocusWrap(lastFocusBeforeDetailsRef.current);
      setLastFocusBeforeDetails('');
    }
  }, [focusDetailsMode]);

  useEffect(() => {
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
        entriesToUpdate = filterNetworkTraffic(networkTraffic, debuggerFilter);
        break;
      }
      case 'dal':
      case 'sas':
      case 'logstash':
      case 'all_analytics': {
        entriesToUpdate = filterNetworkTrafficByUrl(
          networkTraffic,
          debuggerFilter,
        );
        break;
      }
      default: {
        let all = [...logs, ...debugs, ...infos, ...warns, ...errors];

        all = all.sort((a, b) => a.time - b.time);
        entriesToUpdate = all;
        break;
      }
    }

    const currentCount = entriesToUpdate.length;
    const modeChanged = debuggerFilter !== prevDebuggerFilterRef.current;
    const countChanged = currentCount !== prevEntryCountRef.current;

    if (modeChanged || countChanged || entries.length === 0) {
      setEntries([]);
      prevDebuggerFilterRef.current = debuggerFilter;
      prevEntryCountRef.current = currentCount;

      if (autoFocusToNewEntryRef.current && !focusDetailsModeRef.current) {
        const isFocusingOnDebugEntry = adapter
          .getCurrentFocusId()
          .includes('DEBUG_ENTRY_');

        if (!isFocusingOnDebugEntry) {
          setSelectedDebugEntryDetails(
            entriesToUpdate?.[entriesToUpdate.length - 1] ?? null,
          );
          window.setTimeout(() => {
            updateScroll(
              entriesToUpdate?.[entriesToUpdate.length - 1]?.id ?? '',
            );
          }, 100);
        }
      }

      lastEntryRef.current =
        entriesToUpdate?.[entriesToUpdate.length - 1] ?? null;
      window.requestAnimationFrame(() => {
        setEntries(entriesToUpdate);
      });
    }
  }, [debuggerFilter, logs, debugs, infos, warns, errors, networkTraffic]);

  const nav = useMemo(() => createNavMap(entries), [entries]);

  const filterCounts = useMemo(() => {
    const allTerminal = [...logs, ...debugs, ...infos, ...warns, ...errors];

    return {
      logs: logs.length,
      debug: debugs.length,
      info: infos.length,
      warn: warns.length,
      errors: errors.length,
      all_terminal: allTerminal.length,
      fetch_xhr: filterNetworkTraffic(networkTraffic, 'fetch_xhr').length,
      other_network: filterNetworkTraffic(networkTraffic, 'other_network')
        .length,
      all_network: networkTraffic.length,
      dal: filterNetworkTrafficByUrl(networkTraffic, 'dal').length,
      sas: filterNetworkTrafficByUrl(networkTraffic, 'sas').length,
      logstash: filterNetworkTrafficByUrl(networkTraffic, 'logstash').length,
      all_analytics: filterNetworkTrafficByUrl(networkTraffic, 'all_analytics')
        .length,
    };
  }, [logs, debugs, infos, warns, errors, networkTraffic]);

  const renderContentDataDetails = useMemo(
    () =>
      focusingOnDebugEntry ||
      (autoFocusToNewEntry && debugModalVisibility === 'not-focusable') ||
      lastFocusBeforeDetails !== '',
    [
      focusingOnDebugEntry,
      autoFocusToNewEntry,
      debugModalVisibility,
      lastFocusBeforeDetails,
    ],
  );

  const restoreFocusToMainApp = useCallback(
    (nextModalVisibility: DebugModalVisibility) => {
      changeFocusWrap(lastFocusRef.current);
      debuggerStore.getState().setShowDebugModal(nextModalVisibility);
    },
    [changeFocusWrap],
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
        debuggerStore
          .getState()
          .setOnScreenDebuggerEnabledPersistent('off', storageKeyPrefix);
        debuggerStore.getState().enableOnScreenDebugger('off');
      });
    });
  }, [restoreFocusToMainApp, storageKeyPrefix]);

  const handleFocusChange = useCallback((nodeId: string) => {
    setFocusingOnDebugEntry(nodeId.includes('DEBUG_ENTRY_'));
  }, []);

  useEffect(() => {
    if (debugModalVisibility !== 'focusable') return undefined;

    const unsubscribe = adapter.onFocusChange(handleFocusChange);

    return unsubscribe;
  }, [debugModalVisibility, handleFocusChange, adapter]);

  const handleBackClick = useCallback(() => {
    if (debugModalVisibilityRef.current !== 'focusable') return;

    if (isDataDetailsSuperExpandedRef.current) {
      setIsDataDetailsSuperExpanded(false);
      setFocusDetailsMode(true);

      return;
    }

    if (focusDetailsModeRef.current) {
      setFocusDetailsMode(false);

      return;
    }

    const currentFocus = adapter.getCurrentFocusId();
    const isFocusOnDebugEntry = currentFocus.includes('DEBUG_ENTRY_');
    const isFocusOnReturnToMainAppButton = currentFocus.includes(
      NAV.FOCUS_MAIN_APP_BUTTON,
    );

    if (!isFocusOnDebugEntry && currentFocus !== NAV.FOCUS_MAIN_APP_BUTTON) {
      changeFocusWrap(NAV.FOCUS_MAIN_APP_BUTTON);

      return;
    }

    const validLastFocusBeforeDetails =
      lastFocusBeforeDetailsRef.current !== '';

    if (isFocusOnReturnToMainAppButton) {
      handleFocusMainApp();
    } else if (isFocusOnDebugEntry) {
      changeFocusWrap(NAV.FOCUS_MAIN_APP_BUTTON);
    } else if (validLastFocusBeforeDetails) {
      changeFocusWrap(lastFocusBeforeDetailsRef.current);
      setLastFocusBeforeDetails('');
      setFocusDetailsMode(false);
      setIsDataDetailsSuperExpanded(false);
    } else {
      changeFocusWrap(NAV.FOCUS_MAIN_APP_BUTTON);
    }
  }, [changeFocusWrap, handleFocusMainApp, adapter]);

  const handleKeydown = useCallback((id: string) => {
    if (!focusDetailsModeRef.current) return;

    try {
      switch (id) {
        case vKey.OK.id: {
          if (focusDetailsModeRef.current)
            setIsDataDetailsSuperExpanded(prev => !prev);

          break;
        }
        case vKey.UP.id: {
          if (dataDetailsRef.current) dataDetailsRef.current.scrollTop -= 100;

          break;
        }
        case vKey.DOWN.id: {
          if (dataDetailsRef.current) dataDetailsRef.current.scrollTop += 100;

          break;
        }
        case vKey.LEFT.id: {
          if (dataDetailsRef.current) dataDetailsRef.current.scrollLeft -= 100;

          break;
        }
        case vKey.RIGHT.id: {
          if (dataDetailsRef.current) dataDetailsRef.current.scrollLeft += 100;

          break;
        }
        default:
          break;
      }
    } catch {
      // Silently handle scroll errors
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
    if (debugModalVisibility !== 'focusable') return;

    lastFocusRef.current = adapter.getCurrentFocusId();

    adapter.assignFocus(
      autoFocusToNewEntryRef.current && lastEntryRef.current?.id
        ? lastEntryRef.current.id
        : NAV.FOCUS_MAIN_APP_BUTTON,
    );
  }, [debugModalVisibility, lastChangeTime, adapter]);

  return debugModalVisibility === 'focusable' ||
    debugModalVisibility === 'not-focusable' ? (
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
            onToggleAutoFocus={() => setAutoFocusToNewEntry(prev => !prev)}
            quickKeySequenceEnabled={quickKeySequenceEnabled}
            sequenceLabel={sequenceLabel}
            recordingFlags={recordingFlags}
            flushFeedbackLabel={flushFeedbackLabel}
            onFlushFeedbackChange={setFlushFeedbackLabel}
            debuggerFilter={debuggerFilter}
            onDebuggerFilterChange={setDebuggerFilter}
            filterCounts={filterCounts}
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
                      if (dataDetailsRef.current) {
                        dataDetailsRef.current.scrollTop = 0;
                        dataDetailsRef.current.scrollLeft = 0;
                      }
                    } catch {
                      // Silently handle
                    }
                  }}
                  onEntryClick={() => {
                    setFocusDetailsMode(true);
                  }}
                />
                {renderContentDataDetails && (
                  <div
                    className={classNames(
                      styles.modalDebugModeContentDataDetails,
                      {
                        [styles.modalDebugModeContentDataDetailsFocused]:
                          focusDetailsMode,
                        [styles.modalDebugModeContentDataDetailsSuperExpanded]:
                          isDataDetailsSuperExpanded,
                      },
                    )}
                    ref={dataDetailsRef}
                  >
                    <OnScreenDebuggerEntryDetails
                      selectedDebugEntryDetails={selectedDebugEntryDetails}
                      debuggerFilter={debuggerFilter}
                    />
                  </div>
                )}

                <div className={styles.modalStatusBar}>
                  {getStatusBarLabel(
                    debugModalVisibility,
                    renderContentDataDetails,
                    focusDetailsMode,
                    isDataDetailsSuperExpanded,
                    sequenceLabel,
                    quickKeySequenceEnabled,
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

/**
 * The main OnScreenDebugger component.
 *
 * Wraps the inner component with NavigationContext and handles initial store setup.
 */
const OnScreenDebugger = ({
  navigationAdapter,
  onVisibilityChange,
  enabled = 'active-on-demand',
  storageKeyPrefix = 'debugger',
  disabled = false,
}: OnScreenDebuggerProps) => {
  // Init from storage and apply enabled prop on mount
  useEffect(() => {
    if (disabled) return;

    initDebuggerFromStorage(storageKeyPrefix);

    // If explicitly set, override stored value
    debuggerStore.getState().enableOnScreenDebugger(enabled);

    if (enabled === 'active-on-start') {
      debuggerStore.getState().setShowDebugModal('not-focusable');
    }
  }, []);

  if (disabled) return null;

  return (
    <NavigationContext.Provider value={navigationAdapter}>
      <OnScreenDebuggerInner
        navigationAdapter={navigationAdapter}
        onVisibilityChange={onVisibilityChange}
        storageKeyPrefix={storageKeyPrefix}
        disabled={disabled}
      />
    </NavigationContext.Provider>
  );
};

export default OnScreenDebugger;
