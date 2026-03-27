import { useEffect, useRef } from 'react';

/**
 * Like useEffect, but skips the first render (runs only on updates).
 */
export default function useUpdateEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
) {
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;

      return undefined;
    }

    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
