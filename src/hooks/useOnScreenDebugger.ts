import { useEffect, useRef } from 'react';
import { environment } from '@accedo/xdk-core';
import { vKey, type Key } from '@accedo/xdk-virtual-key';

import { useOnScreenDebuggerStore } from '../store/onScreenDebuggerStore';
import { normalizeParams, getCallSiteInfo, parseResponseBody } from '../utils';
import useEvent from './useEvent';
import { IS_PROD } from '../config/env';
import useToggleDebugModal from './useToggleDebugModal';
import { lrud } from '../navigation';
import useDeviceListener from './useDeviceListener';

const KEY_EVENT_PREFIX = 'device:vkey:';

// Type for storing original functions
type OriginalFunctions = {
  originalLog: typeof console.log;
  originalDebug: typeof console.debug;
  originalInfo: typeof console.info;
  originalWarn: typeof console.warn;
  originalError: typeof console.error;
  originalFetch: typeof window.fetch;
  originalSendBeacon: typeof navigator.sendBeacon | null;
  OriginalXMLHttpRequest: typeof XMLHttpRequest;
  wrappedLog: (...params: unknown[]) => void;
  wrappedDebug: (...params: unknown[]) => void;
  wrappedInfo: (...params: unknown[]) => void;
  wrappedWarn: (...params: unknown[]) => void;
  wrappedError: (...params: unknown[]) => void;
  wrappedFetch: typeof window.fetch;
  wrappedSendBeacon: typeof navigator.sendBeacon | null;
};

// Pending network entry from fetch/XHR wrapper (has detailed data)
type PendingFetchEntry = {
  url: string;
  // Kept as `string` because real HTTP methods (PATCH, HEAD, OPTIONS, etc.)
  // are broader than FetchEntryType's union. Cast to `as any` at dispatch sites.
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  status: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  responseJson?: any;
  responseError?: any;
  timestamp: number;
  source: 'fetch' | 'xhr' | 'beacon';
  dispatched: boolean;
};

// Pending network entry from PerformanceObserver (has timing data)
type PendingObserverEntry = {
  url: string;
  timestamp: number;
  duration: number;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  initiatorType: string;
  dispatched: boolean;
};

// Time window for matching entries (ms)
const MATCH_TIME_WINDOW = 3000;

// Cleanup interval for old pending entries (ms)
const CLEANUP_INTERVAL = 5000;

// Max age for pending entries before cleanup (ms)
const MAX_PENDING_AGE = 10000;

// Key sequence to enable/focus debug modal (LEFT, LEFT, LEFT, RIGHT, LEFT)
const { LEFT, RIGHT, UP, DOWN, OK } = vKey;

export const SEQUENCE_ENABLE_DISABLE_DEBUG_UI = [LEFT, LEFT, LEFT, RIGHT, LEFT];

export const getLabelForSequence = (id: string) => {
  switch (id) {
    case LEFT.id:
      return '<';
    case RIGHT.id:
      return '>';
    default:
      return id;
  }
};

/**
 * Checks if the key sequence is satisfied. Pure function that returns
 * both the result and the next index to store externally.
 */
const checkEnableDisableSequence = (
  id: string,
  currentIndex: number
): { isDone: boolean; nextIndex: number } => {
  if (id === SEQUENCE_ENABLE_DISABLE_DEBUG_UI[currentIndex].id) {
    const nextIndex = currentIndex + 1;
    const isDone = nextIndex >= SEQUENCE_ENABLE_DISABLE_DEBUG_UI.length;

    return { isDone, nextIndex: isDone ? 0 : nextIndex };
  }

  return { isDone: false, nextIndex: 0 };
};

/**
 * Normalize URL for matching (remove query params variations, trailing slashes)
 */
const normalizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
};

/**
 * Generic function to find a matching pending entry by URL within the time window
 */
const findMatchingEntry = <T extends { url: string; timestamp: number; dispatched: boolean }>(
  pendingEntries: Map<string, T[]>,
  url: string,
  timestamp: number
): T | null => {
  const normalizedUrl = normalizeUrl(url);

  // Try exact URL first
  let entries = pendingEntries.get(url);

  // Then try normalized URL
  if (!entries || entries.length === 0) {
    entries = pendingEntries.get(normalizedUrl);
  }

  // Search through all entries for a URL match
  if (!entries || entries.length === 0) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [entryUrl, entryList] of pendingEntries.entries()) {
      if (
        normalizeUrl(entryUrl) === normalizedUrl ||
        url.includes(entryUrl) ||
        entryUrl.includes(url)
      ) {
        entries = entryList;
        break;
      }
    }
  }

  if (!entries || entries.length === 0) {
    return null;
  }

  // Find the closest match within the time window that hasn't been dispatched
  let bestMatch: T | null = null;
  let bestTimeDiff = Infinity;

  entries.forEach(entry => {
    if (entry.dispatched) {
      return;
    }

    const timeDiff = Math.abs(entry.timestamp - timestamp);

    if (timeDiff <= MATCH_TIME_WINDOW && timeDiff < bestTimeDiff) {
      bestTimeDiff = timeDiff;
      bestMatch = entry;
    }
  });

  return bestMatch;
};

/**
 * Add entry to pending map (generic for both fetch and observer entries)
 */
const addPendingEntry = <T extends { url: string }>(
  pendingEntries: Map<string, T[]>,
  entry: T
): void => {
  const existing = pendingEntries.get(entry.url) || [];

  existing.push(entry);
  pendingEntries.set(entry.url, existing);

  // Also store under normalized URL for easier matching
  const normalizedUrl = normalizeUrl(entry.url);

  if (normalizedUrl !== entry.url) {
    const normalizedExisting = pendingEntries.get(normalizedUrl) || [];

    normalizedExisting.push(entry);
    pendingEntries.set(normalizedUrl, normalizedExisting);
  }
};

/**
 * Cleanup old pending entries (generic for both fetch and observer entries)
 */
const cleanupPendingEntries = <T extends { timestamp: number }>(
  pendingEntries: Map<string, T[]>
): void => {
  const now = Date.now();

  pendingEntries.forEach((entries, url) => {
    const filtered = entries.filter(entry => now - entry.timestamp < MAX_PENDING_AGE);

    if (filtered.length === 0) {
      pendingEntries.delete(url);
    } else if (filtered.length !== entries.length) {
      pendingEntries.set(url, filtered);
    }
  });
};

/**
 * Factory for creating console method wrappers that record to the Zustand store.
 */
const createConsoleWrapper = (
  addEntry: (payload: { params: string[]; callSite: ReturnType<typeof getCallSiteInfo> }) => void,
  originalFn: (...args: unknown[]) => void
): ((...params: unknown[]) => void) => {
  return (...params: unknown[]) => {
    try {
      const callSite = getCallSiteInfo();
      const dispatchEntry = () => addEntry({ params: normalizeParams(params), callSite });

      window.requestAnimationFrame(dispatchEntry);
      originalFn(...params);
    } catch (error) {
      (window.console as any).originalLog?.('suppressed error for console wrapper:', error);
    }
  };
};

/**
 * Merge fetch/XHR entry with observer entry and dispatch to the store
 */
const dispatchMergedNetworkEntry = (
  fetchEntry: PendingFetchEntry,
  observerEntry: PendingObserverEntry | null,
  sourceOrder: string
): void => {
  // Build performance info from observer entry (if available)
  const performanceInfo = observerEntry
    ? {
        duration: Math.round(observerEntry.duration),
        transferSize: observerEntry.transferSize,
        encodedBodySize: observerEntry.encodedBodySize,
        decodedBodySize: observerEntry.decodedBodySize,
        initiatorType: observerEntry.initiatorType,
        source: sourceOrder,
      }
    : null;

  // Build headers with performance info
  const headers: Record<string, string> = {
    ...(fetchEntry.requestHeaders || {}),
  };

  if (performanceInfo) {
    headers['x-performance'] = JSON.stringify(performanceInfo);
  }

  const dispatchMergedEntry = () =>
    useOnScreenDebuggerStore.getState().addNetworkTraffic({
      url: fetchEntry.url,
      options: {
        method: fetchEntry.method as any,
        headers,
        body: fetchEntry.requestBody,
      },
      response: {
        json: fetchEntry.responseJson,
        error: fetchEntry.responseError,
        status: fetchEntry.status,
      },
    });

  window.requestAnimationFrame(dispatchMergedEntry);
};

type XHRInterceptorConfig = {
  OriginalXMLHttpRequest: typeof XMLHttpRequest;
  performanceObserverAvailableRef: { current: boolean };
  pendingFetchEntriesRef: { current: Map<string, PendingFetchEntry[]> };
  pendingObserverEntriesRef: { current: Map<string, PendingObserverEntry[]> };
};

/**
 * Creates an XMLHttpRequest interceptor that records network traffic.
 * Extracted to module level to limit function nesting depth.
 */
const createXMLHttpRequestInterceptor = ({
  OriginalXMLHttpRequest,
  performanceObserverAvailableRef,
  pendingFetchEntriesRef,
  pendingObserverEntriesRef,
}: XHRInterceptorConfig): typeof XMLHttpRequest => {
  // eslint-disable-next-line func-names
  return function XMLHttpRequestInterceptor(...args: ConstructorParameters<typeof XMLHttpRequest>) {
    try {
      const xhr = new OriginalXMLHttpRequest(...args);

      // Store request info
      let requestMethod = 'GET';
      let requestUrl = '';
      let requestBody: any = null;
      let startTime = 0;

      const originalOpen = xhr.open;

      // eslint-disable-next-line func-names
      xhr.open = function (
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null
      ) {
        requestMethod = method.toUpperCase();
        requestUrl = typeof url === 'string' ? url : url.toString();

        return originalOpen.call(this, method, url, async ?? true, username, password);
      };

      const originalSend = xhr.send;

      const parseXhrResponseBody = (): string | null => {
        try {
          if (xhr.responseType === '' || xhr.responseType === 'text') {
            try {
              return JSON.parse(xhr.responseText);
            } catch {
              return xhr.responseText;
            }
          } else if (xhr.responseType === 'json') {
            return xhr.response;
          }
        } catch {
          // Ignore response parsing errors
        }

        return null;
      };

      const handleXhrLoadEnd = () => {
        const responseBody = parseXhrResponseBody();

        if (!performanceObserverAvailableRef.current) {
          const dispatchXhrEntry = () =>
            useOnScreenDebuggerStore.getState().addNetworkTraffic({
              url: requestUrl,
              options: { method: requestMethod as any, body: requestBody },
              response: {
                json: xhr.status < 400 ? responseBody : null,
                error: xhr.status >= 400 ? responseBody : null,
                status: xhr.status,
              },
            });

          window.requestAnimationFrame(dispatchXhrEntry);

          return;
        }

        const fetchEntry: PendingFetchEntry = {
          url: requestUrl,
          method: requestMethod,
          requestBody,
          status: xhr.status,
          responseBody,
          responseJson: xhr.status < 400 ? responseBody : null,
          responseError: xhr.status >= 400 ? responseBody : null,
          timestamp: startTime,
          source: 'xhr',
          dispatched: false,
        };

        // Check if PerformanceObserver already captured this request
        const observerEntry = findMatchingEntry(
          pendingObserverEntriesRef.current,
          requestUrl,
          startTime
        );

        if (observerEntry) {
          // Observer arrived first - merge and dispatch
          observerEntry.dispatched = true;
          fetchEntry.dispatched = true;
          dispatchMergedNetworkEntry(fetchEntry, observerEntry, 'observer+xhr');
        } else {
          // No observer entry yet - add to pending for later merging
          addPendingEntry(pendingFetchEntriesRef.current, fetchEntry);
        }
      };

      // eslint-disable-next-line func-names
      xhr.send = function (body?: XMLHttpRequestBodyInit | null) {
        startTime = Date.now();
        requestBody = body;
        xhr.addEventListener('loadend', handleXhrLoadEnd);
        originalSend.call(this, body);
      };

      return xhr;
    } catch (error) {
      return new OriginalXMLHttpRequest(...args);
    }
  } as any as typeof XMLHttpRequest;
};

const useOnScreenDebugger = () => {
  const isOnScreenDebuggerEnabled = useOnScreenDebuggerStore(s => s.isEnabled);
  const debugModalVisibility = useOnScreenDebuggerStore(s => s.debugModalVisibility);

  const quickKeySequenceEnabled = useOnScreenDebuggerStore(s => s.quickKeySequence);
  const recordLog = useOnScreenDebuggerStore(s => s.recordLog);
  const recordDebug = useOnScreenDebuggerStore(s => s.recordDebug);
  const recordInfo = useOnScreenDebuggerStore(s => s.recordInfo);
  const recordWarn = useOnScreenDebuggerStore(s => s.recordWarn);
  const recordError = useOnScreenDebuggerStore(s => s.recordError);
  const recordNetworkTraffic = useOnScreenDebuggerStore(s => s.recordNetworkTraffic);
  const { toggleDebugModal } = useToggleDebugModal();

  // Ref to store original and wrapped functions
  const functionsRef = useRef<OriginalFunctions | null>(null);

  // Ref to store pending fetch/XHR entries (waiting for PerformanceObserver data)
  const pendingFetchEntriesRef = useRef<Map<string, PendingFetchEntry[]>>(new Map());

  // Ref to store pending observer entries (waiting for fetch/XHR data)
  const pendingObserverEntriesRef = useRef<Map<string, PendingObserverEntry[]>>(new Map());

  // Ref to track URLs already dispatched by PerformanceObserver
  const observerDispatchedRef = useRef<Set<string>>(new Set());

  // Ref to track if PerformanceObserver is available (for fallback logic in fetch wrapper)
  const performanceObserverAvailableRef = useRef<boolean>(true);

  // Ref to track key sequence progress (avoids module-level mutable state)
  const sequenceIndexRef = useRef(0);

  // Key sequence listener: LEFT, LEFT, LEFT, RIGHT, LEFT to open/focus debug modal
  const onKeyUp = useEvent((data: { id: string }) => {
    const { id } = data;

    const { isDone, nextIndex } = checkEnableDisableSequence(id, sequenceIndexRef.current);

    sequenceIndexRef.current = nextIndex;

    const enableDisableOnScreenDebugger =
      !IS_PROD && isOnScreenDebuggerEnabled !== 'off' && quickKeySequenceEnabled && isDone;

    if (enableDisableOnScreenDebugger && debugModalVisibility !== 'focusable') {
      toggleDebugModal('focusable');
    }
  });

  const handleKeydownForNavigation = useEvent((id: string) => {
    if (debugModalVisibility !== 'focusable') {
      return;
    }

    switch (id) {
      case UP.id:
      case DOWN.id:
      case LEFT.id:
      case RIGHT.id: {
        lrud.handleKeyEvent({
          direction: id.substring(KEY_EVENT_PREFIX.length) as any,
        });

        break;
      }

      case OK.id:
        lrud.handleKeyEvent({ direction: 'enter' });
        break;
      // case BACK.id:
      //   handleBackClick();

      default:
        break;
    }
  });

  useDeviceListener<Key>(environment.SYSTEM.KEYDOWN, ({ id }) => {
    handleKeydownForNavigation(id);
  });

  useEffect(() => {
    if (IS_PROD || isOnScreenDebuggerEnabled === 'off') {
      return undefined;
    }

    environment.addEventListener(environment.SYSTEM.KEYUP, onKeyUp);

    return () => {
      environment.removeEventListener(environment.SYSTEM.KEYUP, onKeyUp);
    };
  }, [onKeyUp, isOnScreenDebuggerEnabled]);

  // Initialize original functions and wrappers (runs once)
  useEffect(() => {
    if (IS_PROD || isOnScreenDebuggerEnabled === 'off') {
      return undefined;
    }

    // Store original functions
    const originalLog = window.console.log;
    const originalDebug = window.console.debug;
    const originalInfo = window.console.info;
    const originalWarn = window.console.warn;
    // TODO: handle window.console.assert
    const originalError = window.console.error;
    const originalFetch = window.fetch;
    // navigator.sendBeacon() is not supported in Safari 10.1
    const originalSendBeacon =
      'sendBeacon' in navigator ? navigator.sendBeacon.bind(navigator) : null;

    const OriginalXMLHttpRequest = window.XMLHttpRequest;

    // Store old functions on console for external access
    (window.console as any).originalLog = originalLog;
    (window.console as any).originalDebug = originalDebug;
    (window.console as any).originalInfo = originalInfo;
    (window.console as any).originalWarn = originalWarn;
    (window.console as any).originalError = originalError;

    const wrappedLog = createConsoleWrapper(
      payload => useOnScreenDebuggerStore.getState().addLog(payload),
      originalLog
    );
    const wrappedDebug = createConsoleWrapper(
      payload => useOnScreenDebuggerStore.getState().addDebug(payload),
      originalDebug
    );
    const wrappedInfo = createConsoleWrapper(
      payload => useOnScreenDebuggerStore.getState().addInfo(payload),
      originalInfo
    );
    const wrappedWarn = createConsoleWrapper(
      payload => useOnScreenDebuggerStore.getState().addWarn(payload),
      originalWarn
    );
    const wrappedError = createConsoleWrapper(
      payload => useOnScreenDebuggerStore.getState().addError(payload),
      originalError
    );

    // Helper to extract URL from fetch arguments
    const getUrlFromFetchArgs = (input: RequestInfo | URL): string => {
      if (typeof input === 'string') {
        return input;
      }

      if (input instanceof Request) {
        return input.url;
      }

      return String(input);
    };

    // Helper to record a fetch/XHR entry: merges with observer if available, otherwise dispatches directly
    const recordFetchEntry = (fetchEntry: PendingFetchEntry): void => {
      if (performanceObserverAvailableRef.current) {
        const observerEntry = findMatchingEntry(
          pendingObserverEntriesRef.current,
          fetchEntry.url,
          fetchEntry.timestamp
        );

        if (observerEntry) {
          // Observer arrived first - merge and dispatch
          observerEntry.dispatched = true;
          const dispatchedEntry = { ...fetchEntry, dispatched: true };

          dispatchMergedNetworkEntry(dispatchedEntry, observerEntry, 'observer+fetch');
        } else {
          // No observer entry yet - add to pending for later merging
          addPendingEntry(pendingFetchEntriesRef.current, fetchEntry);
        }
      } else {
        const dispatchFetchEntry = () =>
          useOnScreenDebuggerStore.getState().addNetworkTraffic({
            url: fetchEntry.url,
            options: {
              method: fetchEntry.method as any,
              headers: fetchEntry.requestHeaders,
              body: fetchEntry.requestBody,
            },
            response: {
              json: fetchEntry.responseJson,
              error: fetchEntry.responseError,
              status: fetchEntry.status,
            },
          });

        window.requestAnimationFrame(dispatchFetchEntry);
      }
    };

    // Wrapped fetch that records network traffic
    // If PerformanceObserver is available, adds to pending entries for later merging
    // If PerformanceObserver is NOT available, dispatches directly to Redux
    const wrappedFetch = async (...args: Parameters<typeof window.fetch>): Promise<Response> => {
      const startTime = Date.now();
      const url = getUrlFromFetchArgs(args[0]);
      const options = args[1] || {};
      const method = (options.method || 'GET').toUpperCase();

      try {
        const response = await originalFetch(...args);
        const responseBody = await parseResponseBody(response);

        recordFetchEntry({
          url,
          method,
          requestHeaders: options.headers as Record<string, string>,
          requestBody: options.body,
          status: response.status,
          responseBody,
          responseJson: response.status < 400 ? responseBody : null,
          responseError: response.status >= 400 ? responseBody : null,
          timestamp: startTime,
          source: 'fetch',
          dispatched: false,
        });

        return response;
      } catch (error) {
        // IMPORTANT: this seems to happen mostly for CORS errors
        // Network error
        recordFetchEntry({
          url,
          method,
          requestHeaders: options.headers as Record<string, string>,
          requestBody: options.body,
          status: 0,
          responseError: error instanceof Error ? error.message : String(error),
          timestamp: startTime,
          source: 'fetch',
          dispatched: false,
        });

        throw error;
      }
    };

    // Wrapped sendBeacon that records network traffic
    const wrappedSendBeacon = originalSendBeacon
      ? (url: string | URL, data?: BodyInit | null): boolean => {
          const timestamp = Date.now();
          const beaconUrl = typeof url === 'string' ? url : url.toString();

          const result = originalSendBeacon(url, data);

          recordFetchEntry({
            url: beaconUrl,
            method: 'POST',
            requestBody: data,
            status: result ? 200 : 0,
            responseError: result ? null : 'sendBeacon failed to queue',
            timestamp,
            source: 'beacon',
            dispatched: false,
          });

          return result;
        }
      : null;

    // Store all functions in ref
    functionsRef.current = {
      originalLog,
      originalDebug,
      originalInfo,
      originalWarn,
      originalError,
      originalFetch,
      originalSendBeacon,
      OriginalXMLHttpRequest,
      wrappedLog,
      wrappedDebug,
      wrappedInfo,
      wrappedWarn,
      wrappedError,
      wrappedFetch,
      wrappedSendBeacon,
    };

    // Intercept XMLHttpRequest with full logging
    (window as any).XMLHttpRequest = createXMLHttpRequestInterceptor({
      OriginalXMLHttpRequest,
      performanceObserverAvailableRef,
      pendingFetchEntriesRef,
      pendingObserverEntriesRef,
    });

    // Cleanup on unmount
    return () => {
      // Restore original functions
      window.console.log = originalLog;
      window.console.debug = originalDebug;
      window.console.info = originalInfo;
      window.console.warn = originalWarn;
      window.console.error = originalError;
      (window as any).fetch = originalFetch;

      if (originalSendBeacon) {
        navigator.sendBeacon = originalSendBeacon;
      }

      (window as any).XMLHttpRequest = OriginalXMLHttpRequest;

      functionsRef.current = null;
    };
  }, [isOnScreenDebuggerEnabled]);

  // Network traffic monitoring using PerformanceObserver (hybrid approach)
  // This catches ALL network requests and merges with fetch/XHR detailed data
  useEffect(() => {
    if (IS_PROD || isOnScreenDebuggerEnabled === 'off' || !recordNetworkTraffic) {
      return undefined;
    }

    // Check if PerformanceObserver is supported
    if (typeof PerformanceObserver === 'undefined') {
      // PerformanceObserver NOT available - fetch wrapper will dispatch directly
      performanceObserverAvailableRef.current = false;
      console.error(
        '[useOnScreenDebugger] PerformanceObserver not available, using fetch wrapper fallback'
      );

      return undefined;
    }

    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) {
      const supportedTypes = PerformanceObserver.supportedEntryTypes;
      const hasResourceType = supportedTypes.includes('resource');

      if (!hasResourceType) {
        // PerformanceObserver doesn't support 'resource' type - use fallback
        performanceObserverAvailableRef.current = false;
        console.error(
          '[useOnScreenDebugger] PerformanceObserver does not support resource type, using fetch wrapper fallback'
        );

        return undefined;
      }
    } else {
      // PerformanceObserver NOT available - use fallback
      performanceObserverAvailableRef.current = false;
      console.warn(
        '[useOnScreenDebugger] PerformanceObserver not fully supported, using fetch wrapper fallback'
      );

      return undefined;
    }

    // PerformanceObserver is available
    performanceObserverAvailableRef.current = true;

    // Setup cleanup interval for old pending entries
    const cleanupTimer = setInterval(() => {
      cleanupPendingEntries(pendingFetchEntriesRef.current);
      cleanupPendingEntries(pendingObserverEntriesRef.current);

      // Sliding window cleanup: evict oldest half to preserve some dedup state
      if (observerDispatchedRef.current.size > 1000) {
        const iterator = observerDispatchedRef.current.values();

        for (let i = 0; i < 500; i += 1) {
          const result = iterator.next();

          if (result.done) {
            break;
          }

          observerDispatchedRef.current.delete(result.value);
        }
      }
    }, CLEANUP_INTERVAL);

    const handlePerformanceEntry = (entry: PerformanceEntry) => {
      if (entry.entryType !== 'resource') {
        return;
      }

      const resourceEntry = entry as PerformanceResourceTiming;
      const {
        name: url,
        startTime,
        initiatorType,
        duration,
        transferSize,
        encodedBodySize,
        decodedBodySize,
      } = resourceEntry;

      // Create unique key to avoid duplicate dispatches
      const entryKey = `${url}-${Math.round(startTime)}`;

      if (observerDispatchedRef.current.has(entryKey)) {
        return;
      }

      observerDispatchedRef.current.add(entryKey);

      // Calculate approximate timestamp from performance timing
      // performance.timeOrigin is not supported in Safari 10.1, Chrome 53 — guarded below
      const timeOrigin =
        'timeOrigin' in performance
          ? performance.timeOrigin
          : Date.now() - (performance as Performance).now();
      const observerTimestamp = timeOrigin + startTime + duration / 2;

      // Try to find matching pending entry from fetch/XHR
      const fetchEntry = findMatchingEntry(pendingFetchEntriesRef.current, url, observerTimestamp);

      if (fetchEntry) {
        // Fetch/XHR arrived first - merge and dispatch
        fetchEntry.dispatched = true;

        // Create a temporary observer entry for merging
        const observerEntry: PendingObserverEntry = {
          url,
          timestamp: observerTimestamp,
          duration,
          transferSize,
          encodedBodySize,
          decodedBodySize,
          initiatorType,
          dispatched: true,
        };

        dispatchMergedNetworkEntry(fetchEntry, observerEntry, `${fetchEntry.source}+observer`);
      } else if (initiatorType === 'xmlhttprequest' || initiatorType === 'fetch') {
        // No fetch entry yet - add to pending observer entries for later merging

        const observerEntry: PendingObserverEntry = {
          url,
          timestamp: observerTimestamp,
          duration,
          transferSize,
          encodedBodySize,
          decodedBodySize,
          initiatorType,
          dispatched: false,
        };

        addPendingEntry(pendingObserverEntriesRef.current, observerEntry);
      } else {
        // Non-fetch/XHR resource (images, scripts, etc.) - dispatch directly
        const performanceInfo = {
          duration: Math.round(duration),
          transferSize,
          encodedBodySize,
          decodedBodySize,
          initiatorType,
          source: 'observer',
        };

        const dispatchNonFetchEntry = () =>
          useOnScreenDebuggerStore.getState().addNetworkTraffic({
            url,
            options: {
              method: 'GET',
              headers: {
                'x-performance': JSON.stringify(performanceInfo),
              },
            },
            response: {
              json: null,
              error: null,
              status: 200,
            },
          });

        window.requestAnimationFrame(dispatchNonFetchEntry);
      }
    };

    // PerformanceObserver is not supported in Safari 10.1, Edge 17 — guarded above with typeof check
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(handlePerformanceEntry);
    });

    try {
      (observer as any).observe({ type: 'resource', buffered: true });

      console.info(
        '[useOnScreenDebugger] Hybrid network monitoring started (PerformanceObserver + fetch/XHR)'
      );
    } catch (error) {
      // PerformanceObserver failed to start - use fallback
      performanceObserverAvailableRef.current = false;
      console.error(
        '[useOnScreenDebugger] PerformanceObserver failed to start, using fetch wrapper fallback:',
        error
      );

      return undefined;
    }

    return () => {
      observer.disconnect();
      clearInterval(cleanupTimer);
    };
  }, [recordNetworkTraffic, isOnScreenDebuggerEnabled]);

  // Function to update overrides based on current flag values
  const updateOverrides = useEvent(() => {
    const fns = functionsRef.current;

    if (!fns) {
      return;
    }

    // Console method overrides
    const consoleOverrides: Array<{
      method: keyof Pick<Console, 'log' | 'debug' | 'info' | 'warn' | 'error'>;
      record: boolean;
      wrapped: (...params: unknown[]) => void;
      original: (...params: unknown[]) => void;
    }> = [
      {
        method: 'log',
        record: recordLog,
        wrapped: fns.wrappedLog,
        original: fns.originalLog,
      },
      {
        method: 'debug',
        record: recordDebug,
        wrapped: fns.wrappedDebug,
        original: fns.originalDebug,
      },
      {
        method: 'info',
        record: recordInfo,
        wrapped: fns.wrappedInfo,
        original: fns.originalInfo,
      },
      {
        method: 'warn',
        record: recordWarn,
        wrapped: fns.wrappedWarn,
        original: fns.originalWarn,
      },
      {
        method: 'error',
        record: recordError,
        wrapped: fns.wrappedError,
        original: fns.originalError,
      },
    ];

    consoleOverrides.forEach(({ method, record, wrapped, original }) => {
      window.console[method] = record ? wrapped : original;
    });

    // Network traffic (fetch wrapper)
    // Always enable when recording - works alongside PerformanceObserver
    if (recordNetworkTraffic) {
      (window as any).fetch = fns.wrappedFetch;
    } else {
      (window as any).fetch = fns.originalFetch;
    }

    // Network traffic (sendBeacon wrapper)
    if (recordNetworkTraffic && fns.wrappedSendBeacon) {
      navigator.sendBeacon = fns.wrappedSendBeacon;
    } else if (fns.originalSendBeacon) {
      navigator.sendBeacon = fns.originalSendBeacon;
    }
  });

  // Update overrides when flags change
  useEffect(() => {
    if (IS_PROD || isOnScreenDebuggerEnabled === 'off') {
      return;
    }

    updateOverrides();
  }, [
    recordLog,
    recordDebug,
    recordInfo,
    recordWarn,
    recordError,
    recordNetworkTraffic,
    updateOverrides,
    isOnScreenDebuggerEnabled,
  ]);
};

export default useOnScreenDebugger;
