declare type XDKNav = {
  id: string;
  parent?: string;
  nextup?: string;
  nextdown?: string;
  nextleft?: string;
  nextright?: string;
  forwardFocus?: string;
  useLastFocus?: boolean;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
  skip?: boolean;
  internal?: {
    nextup?: () => void;
    nextdown?: () => void;
    nextleft?: () => void;
    nextright?: () => void;
  };
  directionReassign?: object;
};

declare type WithFocusProps = {
  nav: XDKNav;
  isFocused: boolean;
};

declare type WithLayoutProps = {
  nav: XDKNav;
};

declare module '@accedo/vdkweb-navigation/lib/utils/withFocus' {
  export type NavigationData = {
    isFocused?: boolean;
    isTraced?: boolean;
    isClicked?: boolean;
    navigate?: string;
    clickId?: number;
  };

  type WithFocus = {
    nav: XDKNav;
    directionReassign?: NavigationData;
    onBlur?: () => void;
    onClick?: () => void;
    onFocus?: () => void;
  };

  /**
   * We tell TS that this HOC will accept and inject additional props
   * to the returned component.
   * Some of these props, such as 'isFocused' are injected by XDK and
   * at the same time, are not passed by the developer.
   * So, we omit these from the Prop validation to prevent a false error
   */
  function withFocus<Props extends object>(
    element: React.ComponentType<Props>
  ): React.ComponentType<Omit<Props & WithFocus, 'isFocused'>>;

  export default withFocus;
}

declare module '@accedo/vdkweb-navigation/lib/utils/withFocusDOM' {
  import type { NavigationData } from '@accedo/vdkweb-navigation/lib/utils/withFocus';

  type RemoveListenerFn = () => void;
  type Fn = <Args extends unknown[], Return = unknown>(...args: Args) => Return;

  type WithFocusDOMArgs = {
    domEl: HTMLElement;
    nav: XDKNav;
    directionReassign?: NavigationData;
    onBlur?: Fn;
    onFocus?: Fn;
    onUpdate?: Fn;
  };

  function withFocusDOM(args: WithFocusDOMArgs): RemoveListenerFn;

  export default withFocusDOM;
}

declare module '@accedo/vdkweb-navigation/lib/utils/withForwardFocus' {
  type WithForwardFocusArgs<ComponentProps> = {
    Component: React.ComponentType<ComponentProps>;
    forwardFocus: string;
  };

  function withForwardFocus<Props extends object>({
    Component,
    forwardFocus,
  }: WithForwardFocusArgs<Props>): React.ComponentType<Props>;

  export default withForwardFocus;
}

declare module '@accedo/vdkweb-navigation/lib/utils/withLayout' {
  export type WithLayout = {
    nav: XDKNav;
    layout: string;
  };

  function withLayout<Props extends object>(
    element: React.ComponentType<Props>
  ): React.ComponentType<Props & WithLayout>;

  export default withLayout;
}

declare module '@accedo/vdkweb-navigation/lib/focusManager' {
  type FocusManager = {
    click: () => void;
    getCurrentFocus: () => string;
    changeFocus: (id: string) => void;
    navigateFocus: (direction: string) => void;
    setPersistTrail: (persist: boolean) => void;
    isFocused: (id: string) => boolean;
    isChildFocused: (id: string) => boolean;
    isValidFocusId: (id: string) => boolean;
    listenToFocusChanged: (fn: (data: any, previousData: any) => void) => () => void;
    unlistenToFocusChanged: (fn: (data: any, previousData: any) => void) => () => void;
    listenToTrailBuilt: (fn: (data: any, previousData: any) => void) => () => void;
    unlistenToTrailBuilt: (fn: (data: any, previousData: any) => void) => () => void;
  };

  const focusManager: FocusManager;

  export default focusManager;
}

declare module '@accedo/vdkweb-navigation' {
  export { default as focusManager } from '@accedo/vdkweb-navigation/lib/focusManager';
  export { default as withFocus } from '@accedo/vdkweb-navigation/lib/utils/withFocus';
  export { default as withFocusDOM } from '@accedo/vdkweb-navigation/lib/utils/withFocusDOM';
  export { default as withForwardFocus } from '@accedo/vdkweb-navigation/lib/utils/withForwardFocus';
  export { default as withLayout } from '@accedo/vdkweb-navigation/lib/utils/withLayout';
  export * from '@accedo/vdkweb-navigation/lib/utils/withLayout';

  type Selectors = {
    CurrentFocusChanged: '[[:current-focus-changed:]]';
    TrailBuilt: '[[:trail-built:]]';
  };

  type EventType = {
    ChangeFocus: 'ChangeFocus';
    Click: 'Click';
    ContinueNavigation: 'ContinueNavigation';
    MarkFocus: 'MarkFocus';
    NavigateFocus: 'NavigateFocus';
    TraceFocus: 'TraceFocus';
  };

  export type ServiceData = {
    click: boolean;
    clickId: number;
    creatingTrail: boolean;
    currentFocus: string;
    currentTraceFocus: string;
    lastFocus: string;
    lastNavigation: string;
    lastFocusOnNavigation: string;
    navigateFocus: string;
    persistTrail: boolean;
    trail: string[] | null;
  };

  type Fn = <Args extends unknown[], Return = unknown>(...args: Args) => Return;
  type RemoveListenerFn = () => void;
  type ListenToFocusEventParams = {
    id: string;
    fn: Fn;
    shouldWarnOnExistingId?: boolean;
  };
  type UnlistenToFocusEventParams = {
    id: string;
    fn: Fn;
    shouldWarnOnExistingId?: boolean;
  };

  type NavigationService = {
    listenToFocusEvent: ({
      id,
      fn,
      shouldWarnOnExistingId,
    }: ListenToFocusEventParams) => RemoveListenerFn;
    unlistenToFocusEvent: ({ id, fn }: UnlistenToFocusEventParams) => void;
    getData: () => ServiceData;
    setPersistTrail: (persistTrail: boolean) => void;
    resetAll: () => void;
    trigger: ({ eventType, eventData }: { eventType: string; eventData: any }) => void;
    EventType: EventType;
    Selectors: Selectors;
  };

  const navigationService: NavigationService;
}
