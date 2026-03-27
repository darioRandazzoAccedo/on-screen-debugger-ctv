import { useEffect, useRef } from 'react';
import { environment } from '@accedo/xdk-core';
import { vKey } from '@accedo/xdk-virtual-key';

import { debuggerStore } from '../store/debuggerStore';
import type { DebugModalVisibility, LogPayload } from '../store/debuggerStore';
import {
  normalizeParams,
  getCallSiteInfo,
  parseResponseBody,
} from '../utils/onScreenDebuggerUtils';
import useEvent from './useEvent';

// Type for storing original functions
type OriginalFunctions = {
  originalLog: typeof console.log;
  originalDebug: typeof console.debug;
  originalInfo: typeof console.info;
  originalWarn: typeof console.warn;
  originalError: typeof console.error;
  originalFetch: typeof window.fetch;
  originalSendBeacon: typeof navigator.sendBeacon;
  OriginalXMLHttpRequest: typeof XMLHttpRequest;
  wrappedLog: (...params: unknown[]) => void;
  wrappedDebug: (...params: unknown[]) => void;
  wrappedInfo: (...params: unknown[]) => void;
  wrappedWarn: (...params: unknown[]) => void;
  wrappedError: (...params: unknown[]) => void;
  wrappedFetch: typeof window.fetch;
  wrappedSendBeacon: typeof navigator.sendBeacon;
};

type PendingFetchEntry = {
  url: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  status: number;
  responseBody?: unknown;
  responseJson?: unknown;
  responseError?: unknown;
  timestamp: number;
  source: 'fetch' | 'xhr' | 'beacon';
  dispatched: boolean;
};

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

const MATCH_TIME_WINDOW = 3000;
const CLEANUP_INTERVAL = 5000;
const MAX_PENDING_AGE = 10000;

const { LEFT, RIGHT } = vKey;

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

const checkEnableDisableSequence = (
  id: string,
  currentIndex: number,
): { isDone: boolean; nextIndex: number } => {
  if (id === SEQUENCE_ENABLE_DISABLE_DEBUG_UI[currentIndex].id) {
    const nextIndex = currentIndex + 1;
    const isDone = nextIndex >= SEQUENCE_ENABLE_DISABLE_DEBUG_UI.length;

    return { isDone, nextIndex: isDone ? 0 : nextIndex };
  }

  return { isDone: false, nextIndex: 0 };
};

const normalizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
};

const findMatchingEntry = <
  T extends { url: string; timestamp: number; dispatched: boolean },
>(
  pendingEntries: Map<string, T[]>,
  url: string,
  timestamp: number,
): T | null => {
  const normalizedUrl = normalizeUrl(url);
  let entries = pendingEntries.get(url);

  if (!entries || entries.length === 0)
    entries = pendingEntries.get(normalizedUrl);

  if (!entries || entries.length === 0) {
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

  if (!entries || entries.length === 0) return null;

  let bestMatch: T | null = null;
  let bestTimeDiff = Infinity;

  entries.forEach(entry => {
    if (entry.dispatched) return;

    const timeDiff = Math.abs(entry.timestamp - timestamp);

    if (timeDiff <= MATCH_TIME_WINDOW && timeDiff < bestTimeDiff) {
      bestTimeDiff = timeDiff;
      bestMatch = entry;
    }
  });

  return bestMatch;
};

const addPendingEntry = <T extends { url: string }>(
  pendingEntries: Map<string, T[]>,
  entry: T,
): void => {
  const existing = pendingEntries.get(entry.url) || [];

  existing.push(entry);
  pendingEntries.set(entry.url, existing);

  const normalizedUrl = normalizeUrl(entry.url);

  if (normalizedUrl !== entry.url) {
    const normalizedExisting = pendingEntries.get(normalizedUrl) || [];

    normalizedExisting.push(entry);
    pendingEntries.set(normalizedUrl, normalizedExisting);
  }
};

const cleanupPendingEntries = <T extends { timestamp: number }>(
  pendingEntries: Map<string, T[]>,
): void => {
  const now = Date.now();

  pendingEntries.forEach((entries, url) => {
    const filtered = entries.filter(
      entry => now - entry.timestamp < MAX_PENDING_AGE,
    );

    if (filtered.length === 0) {
      pendingEntries.delete(url);
    } else if (filtered.length !== entries.length) {
      pendingEntries.set(url, filtered);
    }
  });
};

const createConsoleWrapper = (
  addFn: (payload: LogPayload) => void,
  originalFn: (...args: unknown[]) => void,
): ((...params: unknown[]) => void) => {
  return (...params: unknown[]) => {
    try {
      const callSite = getCallSiteInfo();
      const dispatchEntry = () =>
        addFn({ params: normalizeParams(params), callSite });

      window.requestAnimationFrame(dispatchEntry);
      originalFn(...params);
    } catch (error) {
      (
        window.console as unknown as Record<
          string,
          (...args: unknown[]) => void
        >
      ).originalLog?.('suppressed error for console wrapper:', error);
    }
  };
};

const dispatchMergedNetworkEntry = (
  fetchEntry: PendingFetchEntry,
  observerEntry: PendingObserverEntry | null,
  sourceOrder: string,
): void => {
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

  const headers: Record<string, string> = {
    ...(fetchEntry.requestHeaders || {}),
  };

  if (performanceInfo) {
    headers['x-performance'] = JSON.stringify(performanceInfo);
  }

  const dispatchEntry = () =>
    debuggerStore.getState().addNetworkTraffic({
      url: fetchEntry.url,
      options: {
        method: fetchEntry.method as
          | 'GET'
          | 'POST'
          | 'PUT'
          | 'DELETE'
          | 'PATCH',
        headers,
        body: fetchEntry.requestBody,
      },
      response: {
        json: fetchEntry.responseJson,
        error: fetchEntry.responseError,
        status: fetchEntry.status,
      },
    });

  window.requestAnimationFrame(dispatchEntry);
};

type XHRInterceptorConfig = {
  OriginalXMLHttpRequest: typeof XMLHttpRequest;
  performanceObserverAvailableRef: { current: boolean };
  pendingFetchEntriesRef: { current: Map<string, PendingFetchEntry[]> };
  pendingObserverEntriesRef: { current: Map<string, PendingObserverEntry[]> };
};

const createXMLHttpRequestInterceptor = ({
  OriginalXMLHttpRequest,
  performanceObserverAvailableRef,
  pendingFetchEntriesRef,
  pendingObserverEntriesRef,
}: XHRInterceptorConfig): typeof XMLHttpRequest => {
  return function XMLHttpRequestInterceptor(
    ...args: ConstructorParameters<typeof XMLHttpRequest>
  ) {
    try {
      const xhr = new OriginalXMLHttpRequest(...args);
      let requestMethod = 'GET';
      let requestUrl = '';
      let requestBody: unknown = null;
      let startTime = 0;
      const originalOpen = xhr.open;

      xhr.open = function (
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
      ) {
        requestMethod = method.toUpperCase();
        requestUrl = typeof url === 'string' ? url : url.toString();

        return originalOpen.call(
          this,
          method,
          url,
          async ?? true,
          username,
          password,
        );
      };

      const originalSend = xhr.send;

      const parseXhrResponseBody = (): unknown => {
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
          // Ignore
        }

        return null;
      };

      const handleXhrLoadEnd = () => {
        const responseBody = parseXhrResponseBody();

        if (!performanceObserverAvailableRef.current) {
          const dispatchXhrEntry = () =>
            debuggerStore.getState().addNetworkTraffic({
              url: requestUrl,
              options: {
                method: requestMethod as
                  | 'GET'
                  | 'POST'
                  | 'PUT'
                  | 'DELETE'
                  | 'PATCH',
                body: requestBody,
              },
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

        const observerEntry = findMatchingEntry(
          pendingObserverEntriesRef.current,
          requestUrl,
          startTime,
        );

        if (observerEntry) {
          observerEntry.dispatched = true;
          fetchEntry.dispatched = true;
          dispatchMergedNetworkEntry(fetchEntry, observerEntry, 'observer+xhr');
        } else {
          addPendingEntry(pendingFetchEntriesRef.current, fetchEntry);
        }
      };

      xhr.send = function (body?: XMLHttpRequestBodyInit | null) {
        startTime = Date.now();
        requestBody = body;
        xhr.addEventListener('loadend', handleXhrLoadEnd);
        originalSend.call(this, body);
      };

      return xhr;
    } catch {
      return new OriginalXMLHttpRequest(...args);
    }
  } as unknown as typeof XMLHttpRequest;
};

const useOnScreenDebugger = (disabled?: boolean) => {
  const store = debuggerStore;
  const isEnabled = store(s => s.isEnabled);
  const debugModalVisibility = store(s => s.debugModalVisibility);
  const quickKeySequenceEnabled = store(s => s.quickKeySequence);
  const recordLog = store(s => s.recordLog);
  const recordDebug = store(s => s.recordDebug);
  const recordInfo = store(s => s.recordInfo);
  const recordWarn = store(s => s.recordWarn);
  const recordError = store(s => s.recordError);
  const recordNetworkTraffic = store(s => s.recordNetworkTraffic);

  const functionsRef = useRef<OriginalFunctions | null>(null);
  const pendingFetchEntriesRef = useRef<Map<string, PendingFetchEntry[]>>(
    new Map(),
  );
  const pendingObserverEntriesRef = useRef<Map<string, PendingObserverEntry[]>>(
    new Map(),
  );
  const observerDispatchedRef = useRef<Set<string>>(new Set());
  const performanceObserverAvailableRef = useRef<boolean>(true);
  const sequenceIndexRef = useRef(0);

  const onKeyUp = useEvent((data: { id: string }) => {
    const { id } = data;
    const { isDone, nextIndex } = checkEnableDisableSequence(
      id,
      sequenceIndexRef.current,
    );

    sequenceIndexRef.current = nextIndex;

    const shouldToggle =
      !disabled && isEnabled !== 'off' && quickKeySequenceEnabled && isDone;

    if (shouldToggle && debugModalVisibility !== 'focusable') {
      debuggerStore
        .getState()
        .setShowDebugModal('focusable' as DebugModalVisibility);
    }
  });

  useEffect(() => {
    if (disabled || isEnabled === 'off') return undefined;

    environment.addEventListener(environment.SYSTEM.KEYUP, onKeyUp);

    return () => {
      environment.removeEventListener(environment.SYSTEM.KEYUP, onKeyUp);
    };
  }, [onKeyUp, isEnabled, disabled]);

  useEffect(() => {
    if (disabled || isEnabled === 'off') return undefined;

    const originalLog = window.console.log;
    const originalDebug = window.console.debug;
    const originalInfo = window.console.info;
    const originalWarn = window.console.warn;
    const originalError = window.console.error;
    const originalFetch = window.fetch;
    const originalSendBeacon = navigator.sendBeacon.bind(navigator);
    const OriginalXMLHttpRequest = window.XMLHttpRequest;

    (window.console as unknown as Record<string, unknown>).originalLog =
      originalLog;
    (window.console as unknown as Record<string, unknown>).originalDebug =
      originalDebug;
    (window.console as unknown as Record<string, unknown>).originalInfo =
      originalInfo;
    (window.console as unknown as Record<string, unknown>).originalWarn =
      originalWarn;
    (window.console as unknown as Record<string, unknown>).originalError =
      originalError;

    const wrappedLog = createConsoleWrapper(
      p => debuggerStore.getState().addLog(p),
      originalLog,
    );
    const wrappedDebug = createConsoleWrapper(
      p => debuggerStore.getState().addDebug(p),
      originalDebug,
    );
    const wrappedInfo = createConsoleWrapper(
      p => debuggerStore.getState().addInfo(p),
      originalInfo,
    );
    const wrappedWarn = createConsoleWrapper(
      p => debuggerStore.getState().addWarn(p),
      originalWarn,
    );
    const wrappedError = createConsoleWrapper(
      p => debuggerStore.getState().addError(p),
      originalError,
    );

    const getUrlFromFetchArgs = (input: RequestInfo | URL): string => {
      if (typeof input === 'string') return input;
      if (input instanceof Request) return input.url;

      return String(input);
    };

    const recordFetchEntry = (fetchEntry: PendingFetchEntry): void => {
      if (performanceObserverAvailableRef.current) {
        const observerEntry = findMatchingEntry(
          pendingObserverEntriesRef.current,
          fetchEntry.url,
          fetchEntry.timestamp,
        );

        if (observerEntry) {
          observerEntry.dispatched = true;
          dispatchMergedNetworkEntry(
            { ...fetchEntry, dispatched: true },
            observerEntry,
            'observer+fetch',
          );
        } else {
          addPendingEntry(pendingFetchEntriesRef.current, fetchEntry);
        }
      } else {
        const dispatchFetchEntry = () =>
          debuggerStore.getState().addNetworkTraffic({
            url: fetchEntry.url,
            options: {
              method: fetchEntry.method as
                | 'GET'
                | 'POST'
                | 'PUT'
                | 'DELETE'
                | 'PATCH',
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

    const wrappedFetch = async (
      ...args: Parameters<typeof window.fetch>
    ): Promise<Response> => {
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

    const wrappedSendBeacon = (
      url: string | URL,
      data?: BodyInit | null,
    ): boolean => {
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
    };

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

    (window as unknown as Record<string, unknown>).XMLHttpRequest =
      createXMLHttpRequestInterceptor({
        OriginalXMLHttpRequest,
        performanceObserverAvailableRef,
        pendingFetchEntriesRef,
        pendingObserverEntriesRef,
      });

    return () => {
      window.console.log = originalLog;
      window.console.debug = originalDebug;
      window.console.info = originalInfo;
      window.console.warn = originalWarn;
      window.console.error = originalError;
      (window as unknown as Record<string, unknown>).fetch = originalFetch;
      navigator.sendBeacon = originalSendBeacon;
      (window as unknown as Record<string, unknown>).XMLHttpRequest =
        OriginalXMLHttpRequest;
      functionsRef.current = null;
    };
  }, [isEnabled, disabled]);

  useEffect(() => {
    if (disabled || isEnabled === 'off' || !recordNetworkTraffic)
      return undefined;

    if (typeof PerformanceObserver === 'undefined') {
      performanceObserverAvailableRef.current = false;

      return undefined;
    }

    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) {
      if (!PerformanceObserver.supportedEntryTypes.includes('resource')) {
        performanceObserverAvailableRef.current = false;

        return undefined;
      }
    } else {
      performanceObserverAvailableRef.current = false;

      return undefined;
    }

    performanceObserverAvailableRef.current = true;

    const cleanupTimer = setInterval(() => {
      cleanupPendingEntries(pendingFetchEntriesRef.current);
      cleanupPendingEntries(pendingObserverEntriesRef.current);

      if (observerDispatchedRef.current.size > 1000) {
        const iterator = observerDispatchedRef.current.values();

        for (let i = 0; i < 500; i += 1) {
          const result = iterator.next();

          if (result.done) break;

          observerDispatchedRef.current.delete(result.value);
        }
      }
    }, CLEANUP_INTERVAL);

    const handlePerformanceEntry = (entry: PerformanceEntry) => {
      if (entry.entryType !== 'resource') return;

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

      const entryKey = `${url}-${Math.round(startTime)}`;

      if (observerDispatchedRef.current.has(entryKey)) return;

      observerDispatchedRef.current.add(entryKey);

      const observerTimestamp =
        performance.timeOrigin + startTime + duration / 2;
      const fetchEntry = findMatchingEntry(
        pendingFetchEntriesRef.current,
        url,
        observerTimestamp,
      );

      if (fetchEntry) {
        fetchEntry.dispatched = true;

        const observerEntryData: PendingObserverEntry = {
          url,
          timestamp: observerTimestamp,
          duration,
          transferSize,
          encodedBodySize,
          decodedBodySize,
          initiatorType,
          dispatched: true,
        };

        dispatchMergedNetworkEntry(
          fetchEntry,
          observerEntryData,
          `${fetchEntry.source}+observer`,
        );
      } else if (
        initiatorType === 'xmlhttprequest' ||
        initiatorType === 'fetch'
      ) {
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
        const performanceInfo = {
          duration: Math.round(duration),
          transferSize,
          encodedBodySize,
          decodedBodySize,
          initiatorType,
          source: 'observer',
        };

        const dispatchNonFetchEntry = () =>
          debuggerStore.getState().addNetworkTraffic({
            url,
            options: {
              method: 'GET',
              headers: { 'x-performance': JSON.stringify(performanceInfo) },
            },
            response: { json: null, error: null, status: 200 },
          });

        window.requestAnimationFrame(dispatchNonFetchEntry);
      }
    };

    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(handlePerformanceEntry);
    });

    try {
      (observer as unknown as { observe: (opts: object) => void }).observe({
        type: 'resource',
        buffered: true,
      });
    } catch {
      performanceObserverAvailableRef.current = false;

      return undefined;
    }

    return () => {
      observer.disconnect();
      clearInterval(cleanupTimer);
    };
  }, [recordNetworkTraffic, isEnabled, disabled]);

  const updateOverrides = useEvent(() => {
    const fns = functionsRef.current;

    if (!fns) return;

    const consoleOverrides = [
      {
        method: 'log' as const,
        record: recordLog,
        wrapped: fns.wrappedLog,
        original: fns.originalLog,
      },
      {
        method: 'debug' as const,
        record: recordDebug,
        wrapped: fns.wrappedDebug,
        original: fns.originalDebug,
      },
      {
        method: 'info' as const,
        record: recordInfo,
        wrapped: fns.wrappedInfo,
        original: fns.originalInfo,
      },
      {
        method: 'warn' as const,
        record: recordWarn,
        wrapped: fns.wrappedWarn,
        original: fns.originalWarn,
      },
      {
        method: 'error' as const,
        record: recordError,
        wrapped: fns.wrappedError,
        original: fns.originalError,
      },
    ];

    consoleOverrides.forEach(({ method, record, wrapped, original }) => {
      window.console[method] = record ? wrapped : original;
    });

    if (recordNetworkTraffic) {
      (window as unknown as Record<string, unknown>).fetch = fns.wrappedFetch;
      navigator.sendBeacon = fns.wrappedSendBeacon;
    } else {
      (window as unknown as Record<string, unknown>).fetch = fns.originalFetch;
      navigator.sendBeacon = fns.originalSendBeacon;
    }
  });

  useEffect(() => {
    if (disabled || isEnabled === 'off') return;

    updateOverrides();
  }, [
    recordLog,
    recordDebug,
    recordInfo,
    recordWarn,
    recordError,
    recordNetworkTraffic,
    updateOverrides,
    isEnabled,
    disabled,
  ]);
};

export default useOnScreenDebugger;
