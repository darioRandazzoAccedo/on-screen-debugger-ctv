import { useEffect } from 'react';
import type { Handler } from '@accedo/xdk-core';
import { environment } from '@accedo/xdk-core';
import useEvent from './useEvent';

/**
 * Creates an XDK environment listener with a stable callback.
 * The listener is set when the component mounts, and unsets when unmounting.
 */
export default function useDeviceListener<EventData = unknown>(
  event: string,
  callback: Handler<EventData>,
  once = false,
) {
  const handlerFn = useEvent(callback);

  useEffect(() => {
    environment.addEventListener(event, handlerFn, once);

    return () => {
      environment.removeEventListener(event, handlerFn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
