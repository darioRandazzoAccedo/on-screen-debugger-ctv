import { useRef, useEffect, useCallback, ReactNode } from 'react';
import classNames from 'classnames';

interface Props {
  /** Unique scroll identifier (used as DOM id prefix). */
  id: string;
  /** Viewport height in vw units. */
  height?: number;
  /** Extra push (in vw) added to scroll calculations. */
  extraPush?: number;
  children: ReactNode;
  className?: string;
}

const DEFAULT_CONTEXT = 1920;

function toVw(pixels: number): number {
  return pixels / (DEFAULT_CONTEXT / 100);
}

/**
 * Simplified scroll container for the debugger.
 *
 * Instead of depending on Redux scroll state like the host app's DOMScroll,
 * this component accepts an imperative scroll handle via `ref` exposed through
 * the `useDebuggerScrollHandle` hook, which the parent component calls with
 * the focused element id to trigger scrolling.
 */
const DebuggerScroll = ({
  id,
  height = toVw(500),
  extraPush = 0,
  children,
  className,
}: Props) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentAxisRef = useRef(0);
  const enableTransitionRef = useRef(false);
  const firstFocusedIdRef = useRef('');

  const scrollToElement = useCallback(
    (elementId: string) => {
      if (!elementId) {
        return;
      }

      const viewport = viewportRef.current;
      const scrollEl = scrollRef.current;

      if (!viewport || !scrollEl) {
        return;
      }

      const element = document.getElementById(elementId);

      if (!element) {
        return;
      }

      if (!firstFocusedIdRef.current) {
        firstFocusedIdRef.current = elementId;
      } else {
        enableTransitionRef.current = true;
      }

      const screenWidth = window.innerWidth;
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const relativeTop =
        (elementTop / screenWidth) * 100 + currentAxisRef.current;
      const elementBottom = relativeTop + (elementHeight / screenWidth) * 100;
      const isFullyVisible = relativeTop > 0 && elementBottom < height;

      if (isFullyVisible && !element.nextElementSibling) {
        return;
      }

      const pushNeeded = elementBottom + extraPush - height;
      const newAxis = Math.min(0, currentAxisRef.current - pushNeeded);

      if (newAxis === currentAxisRef.current) {
        return;
      }

      currentAxisRef.current = Math.round(newAxis);
      scrollEl.style.transform = `translateY(${currentAxisRef.current}vw)`;
    },
    [height, extraPush],
  );

  // Expose scrollToElement via a DOM event so parent can call it without prop-drilling
  useEffect(() => {
    const el = viewportRef.current;

    if (!el) {
      return undefined;
    }

    const handleScroll = (e: Event) => {
      const custom = e as CustomEvent<{ focusedId: string }>;

      scrollToElement(custom.detail.focusedId);
    };

    el.addEventListener('debugger-scroll', handleScroll);

    return () => el.removeEventListener('debugger-scroll', handleScroll);
  }, [scrollToElement]);

  return (
    <div
      id={`scroll-${id}`}
      ref={viewportRef}
      className={classNames(className)}
      style={{
        height: `${height}vw`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={scrollRef}
        style={{
          transform: `translateY(${currentAxisRef.current}vw)`,
          transition: enableTransitionRef.current
            ? 'transform 0.2s ease'
            : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default DebuggerScroll;

/**
 * Returns a function that, when called with an element id, dispatches a custom event
 * to the DebuggerScroll container with the given scrollId, causing it to scroll.
 */
export function useDebuggerScrollUpdate(scrollId: string) {
  return useCallback(
    (focusedId: string) => {
      const el = document.getElementById(`scroll-${scrollId}`);

      if (el) {
        el.dispatchEvent(
          new CustomEvent('debugger-scroll', {
            detail: { focusedId },
            bubbles: false,
          }),
        );
      }
    },
    [scrollId],
  );
}
