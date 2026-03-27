import type { CSSProperties, ReactNode } from 'react';
import classNames from 'classnames';
import type { NodeRegistration } from '../../navigation/types';
import useFocus from '../../hooks/useFocus';

type Props = {
  /** DOM/nav node id. If omitted, nav.id is used as fallback. */
  id?: string;
  nav?: Partial<NodeRegistration> & { id?: string };
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: NodeRegistration['onBlur'];
  children?: ReactNode;
  className?: string;
  classNameFocused?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
  'data-scroll-full'?: boolean;
};

/**
 * Library-internal Button. Registers a navigation node via the NavigationAdapter,
 * tracks focus state, and applies focused CSS class when focused.
 * No TTS, no pointer context, no XDK device detection.
 */
const Button = ({
  id,
  nav = {},
  onClick,
  onFocus,
  onBlur,
  children,
  className,
  classNameFocused,
  style,
  ariaLabel,
  disabled,
  ...props
}: Props) => {
  const { id: navId, ...navReg } = nav;
  const nodeId = id ?? navId ?? '';
  const isFocused = useFocus(nodeId, {
    ...navReg,
    isFocusable: navReg.isFocusable ?? true,
    onFocus: onFocus ? () => onFocus() : undefined,
    onBlur,
    onSelect: onClick,
  });

  return (
    <button
      type="button"
      id={nodeId}
      onClick={onClick}
      style={style}
      data-scroll-full={props['data-scroll-full']}
      data-tts-aria-label={ariaLabel}
      className={classNames(className, {
        [classNameFocused ?? '']: isFocused && classNameFocused,
      })}
      disabled={disabled}
      aria-hidden
      tabIndex={-1}
    >
      {children}
    </button>
  );
};

export default Button;
