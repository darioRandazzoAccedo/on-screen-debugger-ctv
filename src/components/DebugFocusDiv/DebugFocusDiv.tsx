import type { Node } from '../../lrud/interfaces';

import { useFocus } from '../../navigation';

type Props = {
  nav: EnhancedXDKNav;
  domRef?: any;
  noId?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode | string;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
  onClick?: () => void;
  onFocus?: (node: Node) => void;
  onBlur?: Node['onBlur'];
  'data-scroll-axis'?: number;
  'data-scroll-full'?: boolean;
  ariaLabel?: string;
  ariaInterrupt?: boolean; // Identify if item can be interrupted during TTS
};

const FocusDiv = ({
  nav,
  noId = false,
  className,
  style = {},
  domRef,
  children,
  onMouseOver,
  onMouseOut,
  onClick,
  onFocus,
  onBlur,
  ariaLabel,
  ariaInterrupt = true,
  ...props
}: Props) => {
  useFocus(nav, {
    onFocus,
    onBlur,
    onClick,
    trackFocus: false,
  });

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseOver}
      onMouseLeave={onMouseOut}
      ref={domRef}
      id={!noId ? nav.id : undefined}
      className={className}
      style={style}
      data-scroll-axis={props['data-scroll-axis']}
      data-scroll-full={props['data-scroll-full']}
      /* Using real aria-label caused issues
      with LG tv, so used this fields as data
    */
      data-tts-aria-label={ariaLabel}
      data-tts-aria-interrupted={ariaInterrupt}
      aria-hidden
      tabIndex={-1}
    >
      {children}
    </div>
  );
};

export default FocusDiv;
