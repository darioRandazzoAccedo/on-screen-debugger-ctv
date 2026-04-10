import { useCallback, useRef } from 'react';
import type { Node } from '../lrud';

import { focusManager } from '../navigation';
import useLatest from './useLatest';
import { useOnScreenDebuggerStore } from '../store/onScreenDebuggerStore';

function isNode(node?: string | Node): node is Node {
  return !!(node as Node)?.id;
}

/**
 * Scroll focus updates for OnScreenDebugger scroll regions (Zustand-backed).
 */
export default function useUpdateScroll(id: string) {
  const currentIdRef = useRef('');
  const setFocusedScrollId = useOnScreenDebuggerStore(
    s => s.setFocusedScrollId,
  );
  const latest = useLatest({ setFocusedScrollId });

  return useCallback(
    (explicitId?: Node | string) => {
      let focusedId = isNode(explicitId) ? explicitId.id : explicitId;

      if (!focusedId) {
        focusedId = focusManager.getCurrentFocus();
      }

      if (focusedId === currentIdRef.current) {
        return;
      }

      latest.current.setFocusedScrollId({
        id,
        focusedId,
        isFirstFocus: !currentIdRef.current,
      });

      currentIdRef.current = focusedId;
    },
    [id, latest],
  );
}
