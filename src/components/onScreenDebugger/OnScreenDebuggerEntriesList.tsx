import classNames from 'classnames';

import DebuggerScroll from '../internal/DebuggerScroll';
import FocusDiv from '../internal/FocusDiv';
import Button from '../internal/Button';
import type { LogEntry } from '../../store/debuggerStore';
import { getDebugEntryAriaLabel } from './onScreenDebuggerLabels';
import styles from './onScreenDebugger.css';
import { HALF_HEIGHT_MODAL } from './onScreenDebuggerUtils';

const DEFAULT_CONTEXT = 1920;

const toVw = (pixels: number): number => pixels / (DEFAULT_CONTEXT / 100);

/**
 * Returns the CSS class name for the status indicator based on HTTP status code.
 */
const getStatusIndicatorClass = (status: number): string => {
  if (status >= 200 && status < 300) return styles.modalStatusIndicatorSuccess;
  if (status >= 300 && status < 400) return styles.modalStatusIndicatorRedirect;
  if (status >= 400 && status < 500)
    return styles.modalStatusIndicatorClientError;
  if (status === 0 || status >= 500)
    return styles.modalStatusIndicatorServerError;

  return styles.modalStatusIndicatorUnknown;
};

/**
 * Renders the content for a network traffic entry with proper formatting.
 */
const renderNetworkTrafficContent = (item: LogEntry) => {
  const method = item.extraParams?.networkTraffic?.options?.method ?? 'GET';
  const status = item.extraParams?.networkTraffic?.response?.status ?? 0;
  const url = item.extraParams?.networkTraffic?.url ?? '';
  const urlSegment = url.split('/').pop() ?? 'url_na';

  return (
    <span className={styles.modalNetworkTrafficEntry}>
      <span className={styles.modalNetworkTrafficMethod}>{method}</span>
      <span
        className={classNames(
          styles.modalStatusIndicator,
          getStatusIndicatorClass(status),
        )}
      >
        &bull;
      </span>
      <span className={styles.modalNetworkTrafficStatus}>{status}</span>
      <span className={styles.modalNetworkTrafficUrl}>{urlSegment}</span>
    </span>
  );
};

type OnScreenDebuggerEntriesListProps = {
  entries: LogEntry[];
  nav: Record<string, { id: string } & Record<string, unknown>>;
  onEntryFocus: (item: LogEntry, entryNavId: string) => void;
  onEntryClick: () => void;
  entriesScrollId: string;
};

const OnScreenDebuggerEntriesList = ({
  entries,
  nav,
  onEntryFocus,
  onEntryClick,
  entriesScrollId,
}: OnScreenDebuggerEntriesListProps) => (
  <DebuggerScroll
    id={entriesScrollId}
    className={styles.modalDebugModeContentData}
    height={toVw(HALF_HEIGHT_MODAL)}
  >
    <FocusDiv
      nav={nav.DEBUG_MODE_ENTRIES_LIST}
      className={styles.modalDebugModeContentDataList}
    >
      {entries.map((item: LogEntry, index: number) => {
        const entryId = item.id;
        const entryNav = nav[entryId];

        if (!entryNav) {
          return null;
        }

        const joinedParams = item.params.join(' ');
        const joinedParamsSlice =
          joinedParams.length > 150
            ? `${joinedParams.slice(0, 150)}...`
            : joinedParams;

        return (
          <Button
            key={entryId}
            nav={entryNav}
            className={classNames(styles.modalDebugModeContentDataItem, {
              [styles.modalDebugModeContentDataItemError]:
                item.type === 'error',
              [styles.modalDebugModeContentDataItemWarn]: item.type === 'warn',
              [styles.modalDebugModeContentDataItemInfo]: item.type === 'info',
              [styles.modalDebugModeContentDataItemDebug]:
                item.type === 'debug',
              [styles.modalDebugModeContentDataItemLog]: item.type === 'log',
              [styles.modalDebugModeContentDataItemNetworkTraffic]:
                item.type === 'networkTraffic',
              [styles.modalDebugModeContentDataItemNetworkTrafficPost]:
                item.type === 'networkTraffic' &&
                item.extraParams?.networkTraffic?.options?.method === 'POST',
              [styles.modalDebugModeContentDataItemNetworkTrafficPut]:
                item.type === 'networkTraffic' &&
                item.extraParams?.networkTraffic?.options?.method === 'PUT',
              [styles.modalDebugModeContentDataItemNetworkTrafficDelete]:
                item.type === 'networkTraffic' &&
                item.extraParams?.networkTraffic?.options?.method === 'DELETE',
            })}
            classNameFocused={styles.modalDebugModeContentDataItemFocused}
            onFocus={() => {
              onEntryFocus(item, entryNav.id);
            }}
            onClick={onEntryClick}
            ariaLabel={getDebugEntryAriaLabel(index)}
          >
            <span>{new Date(item.time).toLocaleTimeString()}</span>
            <span className={styles.modalDebugModeContentDataItemPipe}>|</span>

            {item.type === 'networkTraffic'
              ? renderNetworkTrafficContent(item)
              : joinedParamsSlice}
          </Button>
        );
      })}
    </FocusDiv>
  </DebuggerScroll>
);

export default OnScreenDebuggerEntriesList;
