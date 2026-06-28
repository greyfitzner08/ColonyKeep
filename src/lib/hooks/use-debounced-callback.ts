import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs]
  );
}
