import { formatStringWithJson } from '../../utils/onScreenDebuggerUtils';
import type { LogEntry } from '../../store/debuggerStore';
import styles from './onScreenDebugger.scss';
import { LABELS } from './onScreenDebuggerLabels';
import {
  type OnScreenDebuggerFilterOptions,
  isNetworkFilters,
  safeJsonParse,
} from './onScreenDebuggerUtils';

type OnScreenDebuggerEntryDetailsProps = {
  selectedDebugEntryDetails: LogEntry | null;
  debuggerFilter: OnScreenDebuggerFilterOptions;
};

const OnScreenDebuggerEntryDetails = ({
  selectedDebugEntryDetails,
  debuggerFilter,
}: OnScreenDebuggerEntryDetailsProps) => (
  <>
    <div className={styles.modalDebugModeContentDataDetailsParams}>
      {selectedDebugEntryDetails?.params?.join(' ').slice(0, 50)}
      ...
    </div>
    {!isNetworkFilters(debuggerFilter) && (
      <div className={styles.modalDebugModeContentDataDetailsExtraParams}>
        {selectedDebugEntryDetails?.time && (
          <span>
            {new Date(selectedDebugEntryDetails?.time).toLocaleTimeString()}
          </span>
        )}
        {selectedDebugEntryDetails?.extraParams?.log?.map(
          (logEntry, index: number) => {
            const logEntryId = `details-log-${index}`;

            return <pre key={logEntryId}>{formatStringWithJson(logEntry)}</pre>;
          },
        )}
      </div>
    )}
    {isNetworkFilters(debuggerFilter) && (
      <>
        <div className={styles.modalDebugModeContentDataDetailsExtraParams}>
          {selectedDebugEntryDetails?.time && (
            <span>
              {new Date(selectedDebugEntryDetails?.time).toLocaleTimeString()}
            </span>
          )}
          <pre>
            {`${LABELS.DETAIL_URL}${JSON.stringify(
              selectedDebugEntryDetails?.extraParams?.networkTraffic?.url,
              null,
              2,
            )}`}
          </pre>
        </div>
        <div className={styles.modalDebugModeContentDataDetailsExtraParams}>
          {LABELS.DETAIL_OPTIONS}
          <pre>
            {JSON.stringify(
              {
                method: selectedDebugEntryDetails?.extraParams?.options?.method,
                headers: {
                  ...(selectedDebugEntryDetails?.extraParams?.options
                    ?.headers as Record<string, string> | undefined),
                  'x-performance': safeJsonParse(
                    selectedDebugEntryDetails?.extraParams?.networkTraffic
                      ?.options?.headers?.['x-performance'] ?? '{}',
                  ),
                },
                body: safeJsonParse(
                  (selectedDebugEntryDetails?.extraParams?.options
                    ?.body as string) ?? '{}',
                ),
              },
              null,
              2,
            )}
          </pre>
        </div>
        <div className={styles.modalDebugModeContentDataDetailsExtraParams}>
          {`${LABELS.DETAIL_RESPONSE}${
            selectedDebugEntryDetails?.extraParams?.networkTraffic?.response
              ?.status ?? ''
          }`}
          <pre>
            {JSON.stringify(
              selectedDebugEntryDetails?.extraParams?.networkTraffic?.response
                ?.json ??
                selectedDebugEntryDetails?.extraParams?.networkTraffic?.response
                  ?.error,
              null,
              2,
            )}
          </pre>
        </div>
      </>
    )}
  </>
);

export default OnScreenDebuggerEntryDetails;
