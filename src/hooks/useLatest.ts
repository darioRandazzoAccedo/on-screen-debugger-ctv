import { useRef } from 'react';

export default function useLatest<Data>(value: Data) {
  const ref = useRef(value);

  ref.current = value;

  return ref;
}
