import type { Node } from '../lrud';
import { Lrud } from '../lrud';
import type { onBlurParam } from '../lrud/interfaces';

const lrud = new Lrud();

lrud.registerNode('root', {
  orientation: undefined,
});

lrud.on('focus', node => {
  document.getElementById(node.id)?.setAttribute('data-focused', 'true');
});

lrud.on('blur', (data: onBlurParam) => {
  document.getElementById(data.node?.id)?.removeAttribute('data-focused');
});

// if (!IS_PROD) {
//   (global as any).onScreenDebuggerLrud = lrud;
// }

/** LRUD's `getNodeFirstFocusableChild` wrapper. */
export function focusFirstFocusableChild(id: string) {
  const firstFocusableChild = lrud.getNodeFirstFocusableChild(lrud.nodes[id]);

  if (!firstFocusableChild) {
    console.warn(`${id} has no focusable children`);

    return;
  }

  lrud.assignFocus(firstFocusableChild);
}

/** LRUD's `registerNode` wrapper that accepts with a VDK-like naviation object. */
export function registerNode(nav: EnhancedXDKNav, options: NodeOptions = {}) {
  lrud.registerNode(nav.id, {
    parent: nav.parent,
    index: nav.index,
    orientation: nav.orientation as Node['orientation'],
    isWrapping: nav.isWrapping,
    isFocusable: nav.isFocusable ?? true,
    // forwardFocus will always required isStopPropagate, so we enable it
    isStopPropagate: nav.isStopPropagate ?? nav.forwardFocus !== undefined,
    onFocus: options.onFocus,
    onBlur: options.onBlur,
    onSelect: options?.onClick,
    shouldCancelLeave: nav?.shouldCancelLeave,
    shouldCancelEnter: nav?.shouldCancelEnter,
  });
}

export default lrud;
