import { useRef, useEffect } from 'react';

export default function useUpdateEffect(callback: () => void, inputs: any[]) {
  const didMountRef = useRef(false);

  useEffect(() => {
    if (didMountRef.current) {
      callback();
    } else {
      didMountRef.current = true;
    }
  }, inputs);
}
