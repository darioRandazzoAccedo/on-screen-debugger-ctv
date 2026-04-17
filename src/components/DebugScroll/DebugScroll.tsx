import type React from 'react';
import { useEffect, useCallback, useMemo, useRef } from 'react';
import classNames from 'classnames';
import _isFunction from 'lodash/isFunction';

import type { ItemMetadata } from '../../utils';
import {
  getResolution,
  navigationEnabler,
  toVw,
  getMaxScroll,
  getLimitedValue,
  getChildrenMetadata,
  filterChildren,
  getScrollItems,
} from '../../utils';
import { useLatest, useUpdateEffect } from '../../hooks';
import { focusManager } from '../../navigation';

import { useOnScreenDebuggerStore } from '../../store/onScreenDebuggerStore';

import styles from './debugScroll.scss';

interface Props {
  id: string;
  firstItem?: string;
  height?: number;
  extraPush?: number;
  restoreState?: boolean | (() => boolean);
  useDOM?: boolean;
  forceScroll?: boolean;
  children: React.ReactNode;
  className?: string;
  hasSwimlaneMetadata?: boolean;
  ignoreBack?: boolean;
  getHasNextSibling?: (element: HTMLElement) => boolean;
  minScrollValue?: number;
  needsScrolling?: boolean;
}

type ScrollItemMetadata = ItemMetadata & {
  scrollFull?: boolean;
};

type Refs = {
  currentAxis: number;
  prevAxis?: number;
  childrenMetadata: Record<string, ScrollItemMetadata> | null;
  maxScroll: number;
  topCompensation: number;
  compensationArray: number[];
  enableTransition: boolean;
  hasAxisBeenRestored: boolean;
  focusToRestore: string;
  lastFocusedId: string;
};

const MIN_SCROLL_VALUE = 0;

const DebugScroll = ({
  id,
  firstItem = '',
  height = toVw(1080),
  extraPush = 0,
  restoreState = false,
  useDOM = false,
  forceScroll = false,
  hasSwimlaneMetadata = false,
  ignoreBack = false,
  getHasNextSibling,
  children,
  minScrollValue = MIN_SCROLL_VALUE,
  className = '',
  needsScrolling,
}: Props) => {
  const backClicked = useOnScreenDebuggerStore(s => s.debuggerScrollBackNonce);
  const setDebuggerScrollIsScrolled = useOnScreenDebuggerStore(s => s.setDebuggerScrollIsScrolled);
  const focusedId = useOnScreenDebuggerStore(s => s.focusedScrollIds[id]) || firstItem;
  const setFocusedScrollId = useOnScreenDebuggerStore(s => s.setFocusedScrollId);
  const clearFocusedScrollState = useOnScreenDebuggerStore(s => s.clearFocusedScrollState);

  const scrollRef = useRef<HTMLDivElement>(null);
  const viewPortRef = useRef<HTMLDivElement>(null);
  const focusRestoreDoneRef = useRef(false);
  const latest = useLatest({
    useDOM,
    extraPush,
    restoreState,
    ignoreBack,
    height,
    hasSwimlaneMetadata,
  });
  const refs = useRef<Refs>({
    currentAxis: 0,
    prevAxis: undefined,
    childrenMetadata: null,
    maxScroll: 0,
    topCompensation: 0,
    compensationArray: [],
    enableTransition: false,
    hasAxisBeenRestored: false,
    focusToRestore: focusedId,
    lastFocusedId: '',
  }).current;

  const getNewAxis = useCallback(
    (elementId: string, childrenMetadata: Record<string, ScrollItemMetadata> | null) => {
      if (!elementId) {
        return 0;
      }

      refs.lastFocusedId = elementId;

      const element = document.getElementById(elementId);

      if (element && element.dataset.scrollAxis !== undefined) {
        return getLimitedValue({
          n: -parseFloat(element.dataset.scrollAxis),
        });
      }

      const metadataHeight = latest.current.hasSwimlaneMetadata ? toVw(125) : 0;

      if (latest.current.useDOM) {
        if (!element) {
          return refs.currentAxis;
        }

        const top = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const { currentAxis } = refs;
        const relativeElementTop = toVw(top, getResolution().width) + currentAxis;
        const elementBottom = relativeElementTop + toVw(elementHeight, getResolution().width);
        const isElementFullyVisible =
          relativeElementTop > 0 && elementBottom + metadataHeight < latest.current.height;
        const hasNextSibling = getHasNextSibling
          ? getHasNextSibling(element)
          : !!element.nextElementSibling;

        if (!forceScroll && isElementFullyVisible && !hasNextSibling) {
          return refs.currentAxis;
        }

        if (needsScrolling) {
          return refs.currentAxis;
        }

        if ((forceScroll || hasNextSibling) && element.dataset.scrollFull === 'true') {
          return getLimitedValue({
            max: minScrollValue,
            n: -toVw(top, getResolution().width) + latest.current.extraPush,
          });
        }

        const pushNeeded = elementBottom + latest.current.extraPush - latest.current.height;
        const newAxis = currentAxis - pushNeeded;

        return getLimitedValue({
          max: minScrollValue,
          n: newAxis,
        });
      }

      const { currentAxis } = refs;

      if (!childrenMetadata || !elementId) {
        return currentAxis;
      }

      const elementMetadata = childrenMetadata[elementId];

      if (!elementMetadata) {
        return currentAxis;
      }

      const { itemStart: top, size: elementHeight } = elementMetadata;
      const relativeElementTop = top + currentAxis;
      const elementBottom = relativeElementTop + elementHeight;
      const pushNeeded =
        elementBottom + latest.current.extraPush + metadataHeight - latest.current.height;
      const newAxis = currentAxis - pushNeeded;
      const isElementFullyVisible = elementBottom + metadataHeight < latest.current.height;
      const hasNextSibling = !!elementMetadata.next;

      if (!forceScroll && isElementFullyVisible && !hasNextSibling) {
        return refs.currentAxis;
      }

      if ((forceScroll || hasNextSibling) && elementMetadata.scrollFull) {
        return getLimitedValue({
          max: minScrollValue,
          n: -top + latest.current.extraPush,
        });
      }

      return getLimitedValue({
        min: refs.maxScroll - metadataHeight,
        max: minScrollValue,
        n: newAxis,
      });
    },
    [getHasNextSibling]
  );

  const totalScrollItems = useDOM ? [] : getScrollItems(children);

  const childrenSubset = useMemo(() => {
    if (!height || !children) {
      return null;
    }

    if (latest.current.useDOM) {
      return null;
    }

    let newAxis = getNewAxis(focusedId, refs.childrenMetadata);
    let childrenData = getChildrenMetadata(children, newAxis, height * 3);

    refs.maxScroll = getMaxScroll(
      childrenData.totalSize,
      latest.current.extraPush,
      getResolution().heightVw
    );

    const { hasAxisBeenRestored, focusToRestore } = refs;
    const shouldRestoreAxis = !hasAxisBeenRestored && focusToRestore;

    if (shouldRestoreAxis) {
      refs.enableTransition = false;
      newAxis = getNewAxis(focusedId, childrenData.itemsMetadata);

      childrenData = getChildrenMetadata(children, newAxis, height * 3);
      refs.maxScroll = getMaxScroll(
        childrenData.totalSize,
        latest.current.extraPush,
        toVw(getResolution().height)
      );
    }

    const { subset, itemsMetadata, compensation, compensationArray } = childrenData;

    refs.topCompensation = compensation;
    refs.compensationArray = compensationArray;
    refs.childrenMetadata = itemsMetadata;
    refs.hasAxisBeenRestored = true;

    return subset;
  }, [height, focusedId, totalScrollItems.length]);

  useUpdateEffect(() => {
    if (latest.current.ignoreBack) {
      return;
    }

    setFocusedScrollId({ id, focusedId: '', isFirstFocus: false });
  }, [backClicked]);

  const onTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && scrollRef.current) {
      navigationEnabler.toggleNavigation(true);
    }
  }, []);

  useEffect(() => {
    refs.currentAxis = getNewAxis(focusedId, refs.childrenMetadata);
  }, [focusedId]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    const { hasAxisBeenRestored, focusToRestore } = refs;

    if (
      focusToRestore &&
      (hasAxisBeenRestored || latest.current.useDOM) &&
      !focusRestoreDoneRef.current
    ) {
      focusRestoreDoneRef.current = true;

      if (focusToRestore !== firstItem) {
        focusManager.changeFocus(focusToRestore);
      }

      if (latest.current.useDOM) {
        refs.currentAxis = getNewAxis(focusedId, refs.childrenMetadata);

        if (scrollElement) {
          scrollElement.style.transform = `translateY(${refs.currentAxis}vw)`;
        }
      }
    }

    if (scrollElement) {
      const parsedTransform = (scrollElement.style.transform ?? '').replace(/[^\d.]/g, '');
      const currentTransform = Math.round(parseFloat(parsedTransform));
      const roundedAbsAxis = Math.abs(Math.round(refs.currentAxis));

      if (roundedAbsAxis === currentTransform) {
        return;
      }

      if (refs.prevAxis === refs.currentAxis) {
        return;
      }

      scrollElement.style.transform = `translateY(${refs.currentAxis}vw)`;

      refs.prevAxis = refs.currentAxis;

      if (refs.enableTransition) {
        navigationEnabler.toggleNavigation(false);
      }
    }

    setDebuggerScrollIsScrolled(refs.currentAxis < 0);

    refs.enableTransition = true;
  }, [focusedId, childrenSubset, setDebuggerScrollIsScrolled]);

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

  return (
    <div
      id={`scroll-${id}`}
      ref={viewPortRef}
      className={classNames(styles.scrollContainer, className)}
      style={{ height: `${height}vw` }}
    >
      <div
        id={`scroll-container-${id}`}
        ref={scrollRef}
        style={{
          transform: `translateY(${refs.currentAxis}vw)`,
        }}
        onTransitionEnd={onTransitionEnd}
        className={classNames(styles.scroll, {
          [styles.transition]: refs.enableTransition,
        })}
      >
        {useDOM ? (
          children
        ) : (
          <>
            <div style={{ height: `${refs.topCompensation}vw` }} />
            {filterChildren(children, childrenSubset)}
          </>
        )}
      </div>
    </div>
  );
};

export default DebugScroll;
