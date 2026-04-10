import { useEffect } from 'react';
import type { Handler } from '@accedo/xdk-core';
import { environment } from '@accedo/xdk-core';

import useEvent from './useEvent';

export default function useDeviceListener<EventData = any>(
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
  }, []);
}
