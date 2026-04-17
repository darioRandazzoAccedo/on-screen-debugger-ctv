import { useCallback } from 'react';

import {
  useOnScreenDebuggerStore,
  type DebugModalVisibility,
} from '../store/onScreenDebuggerStore';
import type { OnScreenDebuggerMode } from '../storage';

export default function useToggleDebugModal() {
  const setShowDebugModal = useOnScreenDebuggerStore(s => s.setShowDebugModal);
  const enableOnScreenDebugger = useOnScreenDebuggerStore(s => s.enableOnScreenDebugger);

  const toggleDebugModalFunc = useCallback(
    (show: DebugModalVisibility) => {
      setShowDebugModal(show);
    },
    [setShowDebugModal]
  );

  const enableDebugModalFunc = useCallback(
    (enable: OnScreenDebuggerMode) => {
      enableOnScreenDebugger(enable);
    },
    [enableOnScreenDebugger]
  );

  return {
    toggleDebugModal: toggleDebugModalFunc,
    enableOnScreenDebugger: enableDebugModalFunc,
  };
}
