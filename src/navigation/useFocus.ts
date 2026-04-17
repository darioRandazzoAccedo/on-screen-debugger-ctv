import { useState, useEffect } from 'react';

import useUpdateEffect from '../hooks/useUpdateEffect';
import useEvent from '../hooks/useEvent';
import useIsMounted from '../hooks/useIsMounted';
import type { Node } from '../lrud';

import * as lrudUtils from './utils';
import lrud, { registerNode, focusFirstFocusableChild } from './lrud';

/**
 * LRUD does not have an equivalent of VDK's `forwardFocus`, so we
 * handle this behavior manually and extend it by allowing passing `0`
 * to reference the first focusable child of a node.
 */
function handleForwardFocus(id: string, forwardFocus: Required<EnhancedXDKNav>['forwardFocus']) {
  if (forwardFocus === 0) {
    focusFirstFocusableChild(id);
  } else {
    lrud.assignFocus(forwardFocus);
  }
}

type UseFocusOptions = NodeOptions & {
  /**
   * If true, `useFocus` will use its internal state and return it to the component.
   * Not all components use/need it, so do toggle it off for a performance boost.
   * Defaults to `true`.
   */
  trackFocus?: boolean;
};

export default function useFocus(nav: EnhancedXDKNav, options: UseFocusOptions = {}) {
  const trackFocus = options.trackFocus ?? true;
  // When nav.forwardFocus is passed, state will never update and can be ignored
  const [isFocused, toggleFocus] = useState(false);
  const isMounted = useIsMounted();

  const onNodeFocus = useEvent<NonNullable<Node['onFocus']>>(node => {
    if (nav.forwardFocus !== undefined) {
      handleForwardFocus(nav.id, nav.forwardFocus);
    } else if (trackFocus && isMounted()) {
      toggleFocus(true);
    }

    if (options.onFocus) {
      options.onFocus(node);
    }
  });

  const onNodeBlur = useEvent<NonNullable<Node['onBlur']>>(data => {
    if (trackFocus) {
      toggleFocus(false);
    }

    if (options.onBlur && isMounted()) {
      options.onBlur(data);
    }
  });

  // If there are no nodes with the nav id, create it
  if (!lrud.getNode(nav.id)) {
    registerNode(nav, { ...options, onFocus: onNodeFocus, onBlur: onNodeBlur });
  }

  useUpdateEffect(() => {
    const node = lrud.getNode(nav.id);

    if (!options?.onClick || !node) {
      return;
    }

    node.onSelect = options.onClick;
  }, [options?.onClick]);

  useUpdateEffect(() => {
    lrud.unregisterOverride(nav.id, 'down');

    if (nav?.useDirectionNav && nav.nextdown) {
      lrudUtils.registerOverride(nav.id, nav.nextdown, 'down');
    }
  }, [nav.nextdown]);

  useUpdateEffect(() => {
    lrud.unregisterOverride(nav.id, 'up');

    if (nav?.useDirectionNav && nav.nextup) {
      lrudUtils.registerOverride(nav.id, nav.nextup, 'up');
    }
  }, [nav.nextup]);

  useUpdateEffect(() => {
    lrud.unregisterOverride(nav.id, 'left');

    if (nav?.useDirectionNav && nav.nextleft) {
      lrudUtils.registerOverride(nav.id, nav.nextleft, 'left');
    }
  }, [nav.nextleft]);

  useUpdateEffect(() => {
    lrud.unregisterOverride(nav.id, 'right');

    if (nav?.useDirectionNav && nav.nextright) {
      lrudUtils.registerOverride(nav.id, nav.nextright, 'right');
    }
  }, [nav.nextright]);

  useEffect(() => {
    if (!lrud.getNode(nav.id)) {
      // fix re-render on hero items
      registerNode(nav, {
        ...options,
        onFocus: onNodeFocus,
        onBlur: onNodeBlur,
      });
    }

    if (nav?.useDirectionNav && lrud.getNode(nav.id)) {
      if (nav.nextdown && nav.id !== nav.nextdown) {
        lrudUtils.registerOverride(nav.id, nav.nextdown, 'down');
      }

      if (nav.nextleft && nav.id !== nav.nextleft) {
        lrudUtils.registerOverride(nav.id, nav.nextleft, 'left');
      }

      if (nav.nextright && nav.id !== nav.nextright) {
        lrudUtils.registerOverride(nav.id, nav.nextright, 'right');
      }

      if (nav.nextup && nav.id !== nav.nextup) {
        lrudUtils.registerOverride(nav.id, nav.nextup, 'up');
      }
    }

    return () => {
      lrud.unregisterOverride(nav.id, 'up');
      lrud.unregisterOverride(nav.id, 'down');
      lrud.unregisterOverride(nav.id, 'left');
      lrud.unregisterOverride(nav.id, 'right');

      if (!nav.preserveNode) {
        lrud.unregisterNode(nav.id, {
          forceRefocus: false,
        });
      }
    };
  }, [nav.id]);

  return isFocused;
}
