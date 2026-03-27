import classNames from 'classnames';

import FocusDiv from '../internal/FocusDiv';
import Button from '../internal/Button';
import DebuggerScroll from '../internal/DebuggerScroll';
import { debuggerStore } from '../../store/debuggerStore';
import styles from './onScreenDebugger.scss';
import {
  LABELS,
  getAutoDetailsFocusLabel,
  getQuickKeySequenceLabel,
  getFilterCountLabel,
} from './onScreenDebuggerLabels';
import {
  type OnScreenDebuggerFilterOptions,
  type FilterButtonConfig,
  type RecordingButtonConfig,
  HALF_HEIGHT_MODAL,
  TOOLBAR_SCROLL_ID,
  TERMINAL_FILTER_BUTTONS,
  NETWORK_TYPE_FILTER_BUTTONS,
  NETWORK_API_FILTER_BUTTONS,
  RECORDING_BUTTONS,
  FLUSH_BUTTONS,
  getFlushLabel,
} from './onScreenDebuggerUtils';

const DEFAULT_CONTEXT = 1920;

const toVw = (pixels: number): number => pixels / (DEFAULT_CONTEXT / 100);

type OnScreenDebuggerToolbarProps = {
  nav: Record<string, { id: string } & Record<string, unknown>>;
  updateToolbarScroll: (id: string) => void;
  handleFocusMainApp: () => void;
  handleCloseDebugModal: () => void;
  handleDisableDebugModal: () => void;
  autoFocusToNewEntry: boolean;
  onToggleAutoFocus: () => void;
  quickKeySequenceEnabled: boolean;
  sequenceLabel: string;
  recordingFlags: Record<RecordingButtonConfig['selectorKey'], boolean>;
  flushFeedbackLabel: string;
  onFlushFeedbackChange: (label: string) => void;
  debuggerFilter: OnScreenDebuggerFilterOptions;
  onDebuggerFilterChange: (mode: OnScreenDebuggerFilterOptions) => void;
  filterCounts: Record<OnScreenDebuggerFilterOptions, number>;
};

const OnScreenDebuggerToolbar = ({
  nav,
  updateToolbarScroll,
  handleFocusMainApp,
  handleCloseDebugModal,
  handleDisableDebugModal,
  autoFocusToNewEntry,
  onToggleAutoFocus,
  quickKeySequenceEnabled,
  sequenceLabel,
  recordingFlags,
  flushFeedbackLabel,
  onFlushFeedbackChange,
  debuggerFilter,
  onDebuggerFilterChange,
  filterCounts,
}: OnScreenDebuggerToolbarProps) => {
  const renderFilterButtons = (
    buttons: FilterButtonConfig[],
    containerNav: { id: string } & Record<string, unknown>,
  ) => (
    <FocusDiv nav={containerNav} className={styles.modalQuickActionsButtons}>
      {buttons.map(({ mode, navKey, label, ariaLabel }) => (
        <Button
          key={navKey}
          className={classNames(styles.modalButton, {
            [styles.modalButtonSelected]: debuggerFilter === mode,
          })}
          classNameFocused={styles.modalButtonFocused}
          onClick={() => onDebuggerFilterChange(mode)}
          onFocus={() => updateToolbarScroll(nav[navKey].id)}
          nav={nav[navKey]}
          ariaLabel={ariaLabel}
        >
          {getFilterCountLabel(label, filterCounts[mode])}
        </Button>
      ))}
    </FocusDiv>
  );

  return (
    <DebuggerScroll
      id={TOOLBAR_SCROLL_ID}
      className={styles.modalAdminUiContent}
      height={toVw(HALF_HEIGHT_MODAL)}
      extraPush={toVw(50)}
    >
      <div className={styles.modalQuickActionsSection}>
        <h2 className={styles.modalDebuggerTitle}>{LABELS.TITLE}</h2>
        <h3 className={styles.modalQuickActionsTitle}>
          {LABELS.SECTION_RETURN}
        </h3>
        <p>{LABELS.DESC_RETURN}</p>
        <FocusDiv
          nav={nav.QUICK_ACTIONS_CONTAINER}
          className={styles.modalQuickActionsButtons}
        >
          <Button
            className={styles.modalButton}
            classNameFocused={styles.modalButtonFocused}
            onClick={handleFocusMainApp}
            onFocus={() => updateToolbarScroll(nav.FOCUS_MAIN_APP_BUTTON.id)}
            nav={nav.FOCUS_MAIN_APP_BUTTON}
            ariaLabel={LABELS.ARIA_FOCUS_MAIN_APP}
          >
            {LABELS.BTN_RETURN_KEEP}
          </Button>
          <Button
            className={styles.modalButton}
            classNameFocused={styles.modalButtonFocused}
            onClick={handleCloseDebugModal}
            onFocus={() => updateToolbarScroll(nav.QUIT_DEBUGGER_BUTTON.id)}
            nav={nav.QUIT_DEBUGGER_BUTTON}
            ariaLabel={LABELS.ARIA_QUIT_DEBUGGER}
          >
            {LABELS.BTN_RETURN_HIDE}
          </Button>
          <Button
            className={styles.modalButton}
            classNameFocused={styles.modalButtonFocused}
            onClick={handleDisableDebugModal}
            onFocus={() => updateToolbarScroll(nav.SWITCH_DEBUG_VIEW_BUTTON.id)}
            nav={nav.SWITCH_DEBUG_VIEW_BUTTON}
            ariaLabel={LABELS.ARIA_SWITCH_DEBUG_VIEW}
          >
            {LABELS.BTN_RETURN_DISABLE}
          </Button>
        </FocusDiv>
      </div>
      <div className={styles.modalQuickActionsSection}>
        <h3 className={styles.modalQuickActionsTitle}>
          {LABELS.SECTION_SETTINGS}
        </h3>
        <p>{LABELS.DESC_SETTINGS}</p>
        <FocusDiv
          nav={nav.SETTINGS_CONTAINER}
          className={styles.modalQuickActionsButtons}
        >
          <Button
            className={styles.modalButton}
            classNameFocused={styles.modalButtonFocused}
            onClick={onToggleAutoFocus}
            onFocus={() =>
              updateToolbarScroll(nav.AUTO_SCROLL_TO_NEW_ENTRY_BUTTON.id)
            }
            nav={nav.AUTO_SCROLL_TO_NEW_ENTRY_BUTTON}
            ariaLabel={LABELS.ARIA_AUTO_DETAILS_FOCUS}
          >
            {getAutoDetailsFocusLabel(autoFocusToNewEntry)}
          </Button>
          <Button
            className={styles.modalButton}
            classNameFocused={styles.modalButtonFocused}
            onClick={() => debuggerStore.getState().toggleQuickKeySequence()}
            onFocus={() =>
              updateToolbarScroll(nav.QUICK_KEY_SEQUENCE_BUTTON.id)
            }
            nav={nav.QUICK_KEY_SEQUENCE_BUTTON}
            ariaLabel={LABELS.ARIA_QUICK_KEY_SEQUENCE}
          >
            {getQuickKeySequenceLabel(sequenceLabel, quickKeySequenceEnabled)}
          </Button>
        </FocusDiv>
      </div>

      <div className={styles.modalQuickActionsSection}>
        <h3 className={styles.modalQuickActionsTitle}>
          {LABELS.SECTION_RECORDING}
        </h3>
        <p>{LABELS.DESC_RECORDING}</p>
        <FocusDiv
          nav={nav.RECORDING_STATUS_CONTAINER}
          className={styles.modalQuickActionsButtons}
        >
          {RECORDING_BUTTONS.map(
            ({ navKey, label, ariaLabel, selectorKey, action }) => (
              <Button
                key={navKey}
                className={classNames(styles.modalButton, {
                  [styles.modalButtonRecordingActive]:
                    recordingFlags[selectorKey],
                })}
                classNameFocused={styles.modalButtonFocused}
                onClick={() => action(!recordingFlags[selectorKey])}
                onFocus={() => updateToolbarScroll(nav[navKey].id)}
                nav={nav[navKey]}
                ariaLabel={ariaLabel}
              >
                {label}
              </Button>
            ),
          )}
        </FocusDiv>
      </div>

      <div className={styles.modalQuickActionsSection}>
        <h3 className={styles.modalQuickActionsTitle}>
          {LABELS.SECTION_FLUSH}
        </h3>
        <p>
          {LABELS.DESC_FLUSH}{' '}
          <span className={styles.modalQuickActionsFeedback}>
            {flushFeedbackLabel}
          </span>
        </p>
        <FocusDiv
          nav={nav.FLUSH_CONTAINER}
          className={styles.modalQuickActionsButtons}
        >
          {FLUSH_BUTTONS.map(({ navKey, label, ariaLabel, action }) => (
            <Button
              key={navKey}
              className={styles.modalButton}
              classNameFocused={styles.modalButtonFocused}
              onClick={() => {
                action();
                onFlushFeedbackChange(getFlushLabel(label));
              }}
              onFocus={() => updateToolbarScroll(nav[navKey].id)}
              nav={nav[navKey]}
              ariaLabel={ariaLabel}
            >
              {label}
            </Button>
          ))}
        </FocusDiv>
      </div>

      <div className={styles.modalQuickActionsSection}>
        <h3 className={styles.modalQuickActionsTitle}>
          {LABELS.SECTION_FILTER_TERMINAL}
        </h3>
        <p>{LABELS.DESC_FILTER_TERMINAL}</p>
        {renderFilterButtons(TERMINAL_FILTER_BUTTONS, nav.DEBUG_MODE_CONTAINER)}
      </div>

      <div className={styles.modalQuickActionsSection}>
        <h3 className={styles.modalQuickActionsTitle}>
          {LABELS.SECTION_FILTER_NETWORK_TYPE}
        </h3>
        <p>{LABELS.DESC_FILTER_NETWORK_TYPE}</p>
        {renderFilterButtons(
          NETWORK_TYPE_FILTER_BUTTONS,
          nav.DEBUG_MODE_NETWORK_CONTAINER,
        )}
      </div>

      <div className={styles.modalQuickActionsSection}>
        <h3 className={styles.modalQuickActionsTitle}>
          {LABELS.SECTION_FILTER_NETWORK_API}
        </h3>
        <p>{LABELS.DESC_FILTER_NETWORK_API}</p>
        {renderFilterButtons(
          NETWORK_API_FILTER_BUTTONS,
          nav.DEBUG_MODE_NETWORK_API_CONTAINER,
        )}
      </div>
    </DebuggerScroll>
  );
};

export default OnScreenDebuggerToolbar;
