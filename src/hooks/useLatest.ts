import { useEffect, useRef } from "react";

/**
 * Keeps a mutable ref in sync with the latest value without forcing re-renders.
 * Useful for stable event handlers that still see fresh data.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
