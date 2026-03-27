import type { Handler } from 'mitt';
import type { Node } from '../lrud';
import type { NavigationAdapter, NodeRegistration } from './types';

/**
 * Shape of an LRUD instance that the host app provides.
 * Matches the public API of the Lrud class in src/lrud/index.ts.
 */
export interface LrudInstance {
  nodes: Record<string, Node>;
  rootNode?: Node;
  currentFocusNode?: Node;
  on(event: string, handler: Handler<Node>): void;
  off(event: string, handler: Handler<Node>): void;
  registerNode(id: string, config?: object): unknown;
  unregisterNode(
    id: string | Node | undefined,
    options?: { forceRefocus?: boolean },
  ): unknown;
  assignFocus(id: string): void;
  handleKeyEvent(event: { direction?: string; keyCode?: number }): void;
  getNode(id: string): Node | undefined;
  getNodeFirstFocusableChild(node: Node | undefined): Node | undefined;
}

/**
 * Creates a NavigationAdapter that wraps an existing LRUD instance.
 *
 * Use this when your host app already uses the same LRUD navigation system.
 * The debugger nodes will be registered into the host app's existing LRUD tree,
 * so key events dispatched to lrud.handleKeyEvent() flow naturally into the
 * debugger overlay when it is focused.
 *
 * @example
 * import lrud from '#/navigation/lrud';
 * import { createLrudAdapter } from '@cbcrc/on-screen-debugger';
 *
 * <OnScreenDebugger navigationAdapter={createLrudAdapter(lrud)} />
 */
export function createLrudAdapter(
  lrudInstance: LrudInstance,
): NavigationAdapter {
  return {
    registerNode(id, config: NodeRegistration = {}) {
      if (lrudInstance.getNode(id)) {
        return;
      }

      lrudInstance.registerNode(id, {
        parent: config.parent,
        orientation: config.orientation as Node['orientation'],
        isFocusable: config.isFocusable,
        isWrapping: config.isWrapping,
        isStopPropagate:
          config.isStopPropagate ?? config.forwardFocus !== undefined,
        onFocus: config.onFocus as Node['onFocus'],
        onBlur: config.onBlur as Node['onBlur'],
        onSelect: config.onSelect,
        shouldCancelLeave:
          config.shouldCancelLeave as Node['shouldCancelLeave'],
        shouldCancelEnter:
          config.shouldCancelEnter as Node['shouldCancelEnter'],
      });
    },

    unregisterNode(id, options) {
      lrudInstance.unregisterNode(id, options);
    },

    assignFocus(id) {
      if (lrudInstance.currentFocusNode?.id === id) {
        return;
      }

      if (!lrudInstance.nodes[id]) {
        return;
      }

      try {
        lrudInstance.assignFocus(id);
      } catch (e) {
        console.error('[LRUD Adapter] - error: ', e);
      }
    },

    getCurrentFocusId() {
      return lrudInstance.currentFocusNode?.id ?? '';
    },

    handleKeyEvent(event) {
      lrudInstance.handleKeyEvent(event);
    },

    onFocusChange(cb) {
      const handler: Handler<Node> = node => cb(node.id);

      lrudInstance.on('focus', handler);

      return () => lrudInstance.off('focus', handler);
    },

    getFirstFocusableChildId(parentId) {
      const parentNode = lrudInstance.getNode(parentId);

      if (!parentNode) {
        return null;
      }

      const child = lrudInstance.getNodeFirstFocusableChild?.(parentNode);

      return child?.id ?? null;
    },
  };
}
