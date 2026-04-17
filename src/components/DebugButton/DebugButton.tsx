import { type CSSProperties } from 'react';
import classNames from 'classnames';
import type { Node } from '../../lrud/interfaces';
import { useFocus } from '../../navigation';

import styles from './debugButton.scss';

type Props = {
  nav: EnhancedXDKNav;
  onClick?: () => void;
  children?: React.ReactNode | string;
  className?: string;
  classNameFocused?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
  onBlur?: Node['onBlur'];
  onFocus?: (node: Node) => void;
  'data-scroll-full'?: boolean;
};

const Button = ({
  nav,
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
  const isFocused = useFocus(nav, {
    onClick,
    onFocus,
    onBlur,
  });

  return (
    <button
      data-scroll-full={props['data-scroll-full']}
      type="button"
      id={nav.id}
      onClick={onClick}
      data-tts-aria-label={ariaLabel}
      style={style}
      className={classNames(styles.button, className || styles.defaultStyle, {
        [classNameFocused || styles.defaultFocused]: isFocused,
        [styles.focused]: isFocused,
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
