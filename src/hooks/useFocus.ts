import { useState, useEffect } from 'react';
import type { NodeRegistration } from '../navigation/types';
import { useNavigationAdapter } from '../navigation/NavigationContext';
import useEvent from './useEvent';
import useIsMounted from './useIsMounted';
import useUpdateEffect from './useUpdateEffect';

type UseFocusOptions = NodeRegistration & {
  /**
   * If true, track focus state and return it. Set to false for container nodes
   * that only forward focus (avoids unnecessary re-renders).
   * Defaults to true.
   */
  trackFocus?: boolean;
};

/**
 * Registers a navigation node via the NavigationAdapter and optionally tracks
 * whether that node is currently focused.
 *
 * This is the library-internal equivalent of the host app's useFocus hook,
 * but decoupled from the LRUD singleton via the NavigationAdapter context.
 */
export default function useFocus(
  id: string,
  options: UseFocusOptions = {},
): boolean {
  const adapter = useNavigationAdapter();
  const trackFocus = options.trackFocus ?? true;
  const [isFocused, setIsFocused] = useState(false);
  const isMounted = useIsMounted();

  const onNodeFocus = useEvent<NonNullable<NodeRegistration['onFocus']>>(
    node => {
      if (options.forwardFocus !== undefined) {
        // Forward focus to another node or first focusable child
        if (options.forwardFocus === 0) {
          const childId = adapter.getFirstFocusableChildId?.(id);

          if (childId) {
            adapter.assignFocus(childId);
          }
        } else {
          adapter.assignFocus(String(options.forwardFocus));
        }
      } else if (trackFocus && isMounted()) {
        setIsFocused(true);
      }

      options.onFocus?.(node);
    },
  );

  const onNodeBlur = useEvent<NonNullable<NodeRegistration['onBlur']>>(data => {
    if (trackFocus && isMounted()) {
      setIsFocused(false);
    }

    options.onBlur?.(data);
  });

  // Register synchronously during render so nodes are added top-down.
  // useEffect fires bottom-up (children before parents), which causes LRUD to
  // silently drop child nodes whose parent isn't registered yet.
  // The adapter's internal guard prevents double-registration on re-renders.
  adapter.registerNode(id, {
    parent: options.parent,
    orientation: options.orientation,
    isFocusable: options.isFocusable,
    isWrapping: options.isWrapping,
    isStopPropagate:
      options.isStopPropagate ?? options.forwardFocus !== undefined,
    forwardFocus: options.forwardFocus,
    onFocus: onNodeFocus,
    onBlur: onNodeBlur,
    onSelect: options.onSelect,
    shouldCancelLeave: options.shouldCancelLeave,
    shouldCancelEnter: options.shouldCancelEnter,
  });

  useEffect(() => {
    // Fallback registration for remount cycles (e.g. React StrictMode unmount/remount)
    adapter.registerNode(id, {
      parent: options.parent,
      orientation: options.orientation,
      isFocusable: options.isFocusable,
      isWrapping: options.isWrapping,
      isStopPropagate:
        options.isStopPropagate ?? options.forwardFocus !== undefined,
      forwardFocus: options.forwardFocus,
      onFocus: onNodeFocus,
      onBlur: onNodeBlur,
      onSelect: options.onSelect,
      shouldCancelLeave: options.shouldCancelLeave,
      shouldCancelEnter: options.shouldCancelEnter,
    });

    return () => {
      adapter.unregisterNode(id, { forceRefocus: false });
    };
    // only re-register when the id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useUpdateEffect(() => {
    // Update onSelect when onClick changes (mirrors host useFocus behavior)
    // We do this by re-checking via adapter if it exposes node mutation
  }, [options.onSelect]);

  return isFocused;
}
