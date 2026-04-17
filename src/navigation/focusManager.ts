import type { Handler } from 'mitt';
import type { Node } from '../lrud';

import lrud from './lrud';

const focusManager = {
  changeFocus(id: string) {
    if (lrud.currentFocusNode?.id === id) {
      return;
    }

    if (!lrud.nodes[id]) {
      console.error(`Attempting to focus non-registed node ${id}`);

      return;
    }

    try {
      lrud.assignFocus(id);
    } catch (e) {
      console.error(e);
    }
  },
  getCurrentFocus() {
    return lrud.currentFocusNode?.id ?? '';
  },
  listenToFocusChanged(cb: Handler<Node>) {
    lrud.on('focus', cb);
  },
  unlistenToFocusChanged(cb: Handler<Node>) {
    lrud.off('focus', cb);
  },
  isFocused(id: string) {
    return lrud.currentFocusNode?.id === id;
  },
  isValidFocusId(id: string) {
    return typeof id === 'string';
  },
  navigateFocus(direction: '' | 'left' | 'right' | 'up' | 'down') {
    if (!direction) {
      return;
    }

    lrud.handleKeyEvent({
      direction,
    });
  },
};

// if (!IS_PROD) {
//   (global as any).onScreenDebuggerFocusManager = focusManager;
// }

export default focusManager;
