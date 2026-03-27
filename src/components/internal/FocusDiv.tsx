import type { CSSProperties, ReactNode } from 'react';
import type { NodeRegistration } from '../../navigation/types';
import useFocus from '../../hooks/useFocus';

type Props = {
  /** DOM/nav node id. If omitted, nav.id is used as fallback. */
  id?: string;
  nav?: Partial<NodeRegistration> & { id?: string };
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  'data-scroll-axis'?: number;
  'data-scroll-full'?: boolean;
};

/**
 * Library-internal FocusDiv. Registers a navigation node via the NavigationAdapter
 * and renders a div with the node's id. No TTS, no pointer, no XDK device detection.
 */
const FocusDiv = ({
  id,
  nav = {},
  className,
  style,
  children,
  ...props
}: Props) => {
  const { id: navId, ...navReg } = nav;
  const nodeId = id ?? navId ?? '';

  useFocus(nodeId, { ...navReg, trackFocus: false });

  return (
    <div
      id={nodeId}
      className={className}
      style={style}
      data-scroll-axis={props['data-scroll-axis']}
      data-scroll-full={props['data-scroll-full']}
      tabIndex={-1}
      aria-hidden
    >
      {children}
    </div>
  );
};

export default FocusDiv;
