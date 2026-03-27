export type NavDirection = 'left' | 'right' | 'up' | 'down' | 'enter';

export interface NodeRegistration {
  parent?: string;
  orientation?: 'horizontal' | 'vertical';
  isFocusable?: boolean;
  isWrapping?: boolean;
  isStopPropagate?: boolean;
  /** When focused, immediately forward to this node id (or 0 for first focusable child) */
  forwardFocus?: string | number;
  onFocus?: (node: { id: string }) => void;
  onBlur?: (data: { node: { id: string }; newNode?: { id: string } }) => void;
  onSelect?: () => void;
  shouldCancelLeave?: (leave: { id: string }, enter: { id: string }) => boolean;
  shouldCancelEnter?: (leave: { id: string }, enter: { id: string }) => boolean;
}

export interface NavigationAdapter {
  /**
   * Register a navigation node in the navigation tree.
   */
  registerNode(id: string, config?: NodeRegistration): void;

  /**
   * Unregister a navigation node from the navigation tree.
   */
  unregisterNode(id: string, options?: { forceRefocus?: boolean }): void;

  /**
   * Assign (programmatically set) focus to a node by id.
   */
  assignFocus(id: string): void;

  /**
   * Get the currently focused node id.
   */
  getCurrentFocusId(): string;

  /**
   * Forward a key event for the navigation system to handle.
   */
  handleKeyEvent(event: { direction: NavDirection }): void;

  /**
   * Subscribe to focus change events.
   * Returns an unsubscribe function.
   */
  onFocusChange(cb: (nodeId: string) => void): () => void;

  /**
   * Get the first focusable child node id of the given node.
   * Returns null if no focusable child found.
   */
  getFirstFocusableChildId?(parentId: string): string | null;
}
