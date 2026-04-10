import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import classNames from 'classnames';
import _isFunction from 'lodash/isFunction';

import {
  getResolution,
  navigationEnabler,
  toVw,
  getLimitedValue,
} from '../../utils';
import { useLatest, useUpdateEffect } from '../../hooks';
import { useOnScreenDebuggerStore } from '../../store/onScreenDebuggerStore';

import styles from './debugScroll.scss';

interface Props {
  id: string;
  fallbackId?: string;
  height?: number;
  extraPush?: number;
  restoreState?: boolean | (() => boolean);
  forceScroll?: boolean;
  children: React.ReactNode;
  className?: string;
  hasSwimlaneMetadata?: boolean;
  ignoreBack?: boolean;
  getHasNextSibling?: (element: HTMLElement) => boolean;
  minScrollValue?: number;
  noTransition?: boolean;
}

type Refs = {
  currentAxis: number;
  enableTransition: boolean;
  firstFocusedId: string;
  lastIsScrolled: boolean;
  elementOffsetCache: Record<
    string,
    {
      offsetHeight: number;
      offsetTop: number;
      hasNextSibling: boolean;
    }
  >;
};

const MIN_SCROLL_VALUE = 0;

const DebugDOMScroll = ({
  id,
  fallbackId = '',
  height = toVw(1080),
  extraPush = 0,
  restoreState = false,
  forceScroll = false,
  hasSwimlaneMetadata = false,
  ignoreBack = false,
  getHasNextSibling,
  children,
  minScrollValue = MIN_SCROLL_VALUE,
  className = '',
  noTransition = false,
}: Props) => {
  const backClicked = useOnScreenDebuggerStore(s => s.debuggerScrollBackNonce);
  const setDebuggerScrollIsScrolled = useOnScreenDebuggerStore(
    s => s.setDebuggerScrollIsScrolled,
  );
  const focusedId =
    useOnScreenDebuggerStore(s => s.focusedScrollIds[id]) || fallbackId;
  const setFocusedScrollId = useOnScreenDebuggerStore(
    s => s.setFocusedScrollId,
  );
  const clearFocusedScrollState = useOnScreenDebuggerStore(
    s => s.clearFocusedScrollState,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const viewPortRef = useRef<HTMLDivElement>(null);
  const latest = useLatest({
    extraPush,
    restoreState,
    ignoreBack,
    height,
    hasSwimlaneMetadata,
  });
  const refs = useRef<Refs>({
    firstFocusedId: '',
    currentAxis: 0,
    enableTransition: false,
    lastIsScrolled: false,
    elementOffsetCache: {},
  }).current;

  const getNewAxis = useCallback(
    (elementId: string) => {
      const element = document.getElementById(elementId);

      if (!element) {
        return 0;
      }

      if (element.dataset.scrollAxis !== undefined) {
        return getLimitedValue({
          n: -parseFloat(element.dataset.scrollAxis),
        });
      }

      const metadataHeight = latest.current.hasSwimlaneMetadata ? toVw(125) : 0;
      const screenWidth = getResolution().width;

      if (!refs.elementOffsetCache[elementId]) {
        refs.elementOffsetCache[elementId] = {
          offsetTop: element.offsetTop,
          offsetHeight: element.offsetHeight,
          hasNextSibling: !!element.nextElementSibling,
        };
      }

      const elementPosition = refs.elementOffsetCache[elementId];

      const top = elementPosition.offsetTop;
      const elementHeight = elementPosition.offsetHeight;
      const { currentAxis } = refs;
      const relativeElementTop = toVw(top, screenWidth) + currentAxis;
      const elementBottom =
        relativeElementTop + toVw(elementHeight, screenWidth);
      const isElementFullyVisible =
        relativeElementTop > 0 &&
        elementBottom + metadataHeight < latest.current.height;
      const hasNextSibling = getHasNextSibling
        ? getHasNextSibling(element)
        : elementPosition.hasNextSibling;

      if (!forceScroll && isElementFullyVisible && !hasNextSibling) {
        return refs.currentAxis;
      }

      if (
        (forceScroll || hasNextSibling) &&
        element.dataset.scrollFull === 'true'
      ) {
        return getLimitedValue({
          max: minScrollValue,
          n: -toVw(top, screenWidth) + latest.current.extraPush,
        });
      }

      const elementExtraPush = Number.parseFloat(
        element.dataset.extraPush || '0',
      );
      const pushNeeded =
        elementBottom +
        latest.current.extraPush +
        elementExtraPush -
        latest.current.height;
      const newAxis = currentAxis - pushNeeded;

      return getLimitedValue({
        max: minScrollValue,
        n: newAxis,
      });
    },
    [getHasNextSibling],
  );

  useUpdateEffect(() => {
    if (latest.current.ignoreBack) {
      return;
    }

    setFocusedScrollId({ id, focusedId: '', isFirstFocus: false });
  }, [backClicked]);

  const onTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && scrollRef.current) {
        navigationEnabler.toggleNavigation(true);
      }
    },
    [],
  );

  useEffect(() => {
    const isScrolled = refs.currentAxis < 0;

    if (refs.lastIsScrolled !== isScrolled) {
      refs.lastIsScrolled = isScrolled;
      setDebuggerScrollIsScrolled(isScrolled);
    }
  }, [focusedId, setDebuggerScrollIsScrolled]);

  useEffect(() => {
    return () => {
      navigationEnabler.toggleNavigation(true);

      const saveState = _isFunction(latest.current.restoreState)
        ? latest.current.restoreState()
        : latest.current.restoreState;

      if (!saveState) {
        clearFocusedScrollState(id);
      }
    };
  }, []);

  if (!refs.firstFocusedId) {
    refs.firstFocusedId = focusedId;
  }

  if (
    !noTransition &&
    refs.firstFocusedId &&
    refs.firstFocusedId !== focusedId
  ) {
    refs.enableTransition = true;
  }

  const newAxis = Math.round(getNewAxis(focusedId));

  if (!noTransition && newAxis !== refs.currentAxis && refs.enableTransition) {
    navigationEnabler.toggleNavigation(false);
  }

  refs.currentAxis = newAxis;

  const containerStyle = useMemo(() => ({ height: `${height}vw` }), [height]);
  const transformStyle = { transform: `translateY(${newAxis}vw)` };

  return (
    <div
      id={`scroll-${id}`}
      ref={viewPortRef}
      className={classNames(styles.scrollContainer, className)}
      style={containerStyle}
    >
      <div
        ref={scrollRef}
        style={transformStyle}
        onTransitionEnd={noTransition ? undefined : onTransitionEnd}
        className={classNames(styles.scroll, {
          [styles.transition]: refs.enableTransition,
        })}
      >
        {children}
      </div>
    </div>
  );
};

export default DebugDOMScroll;
