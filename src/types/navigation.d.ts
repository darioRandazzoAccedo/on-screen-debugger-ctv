import type { Node } from 'lrud';

declare global {
  /**
   * XDK Navigation object, extended for backward compatibility between LRUD and VDK.
   * See [docs](https://github.com/bbc/lrud/blob/master/docs/usage.md) for more information of LRUD.
   */
  type EnhancedXDKNav = Omit<XDKNav, 'forwardFocus'> & {
    /** Defines the node orientation. */
    orientation?: Node['orientation'] | string;
    /** Whether the node is focusable or not. This value can be directly updated after the node is registered. */
    isFocusable?: Node['isFocusable'];
    /** Index of node, relative to its siblings. */
    index?: Node['index'];
    /** Allows dealing with a situation when focusable parent contains focusable children. */
    isStopPropagate?: Node['isStopPropagate'];
    /** Prevents LRUD from unregistering the node when the component unmounts. When remounted, the same LRUD node will be used. */
    preserveNode?: boolean;
    /** Overrides LRUD default behavior in favor of directional navigation passed (à la VDK). */
    useDirectionNav?: boolean;
    /** Used in conjunction with orientation to make a list wrap at the top/bottom or left/right depending on orientation. */
    isWrapping?: Node['isWrapping'];
    /** If given, the `shouldCancelLeave` function will be called when a move is being processed, and the node is being *left*. If `shouldCancelLeave` returns true, the move will be cancelled. */
    shouldCancelLeave?: Node['shouldCancelLeave'];
    /** If given, the `shouldCancelEnter` function will be called when a move is being processed, and the node is being *entered*. If `shouldCancelEnter` returns true, the move will be cancelled. */
    shouldCancelEnter?: Node['shouldCancelEnter'];
    /** When `0`, the focus will move to the first focusable child. */
    forwardFocus?: string | 0;
  };

  type EnhancedNavMap = {
    [key: string]: EnhancedXDKNav;
  };

  /** LRUD events passed a a separate set of options for backward compatibility with VDK.  */
  type NodeOptions = {
    /** If given, the onSelect function will be called when the node is focused and a key event of "ENTER" is handled. */
    onClick?: Node['onSelect'];
    /** If given, the onFocus function will be called when the node gets focussed on. */
    onFocus?: Node['onFocus'];
    /** If given, the onBlur function will be called when the node if the node had focus and a new node gains focus. */
    onBlur?: Node['onBlur'];
  };
}
