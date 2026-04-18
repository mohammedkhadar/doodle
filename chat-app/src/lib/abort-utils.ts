/**
 * Aborts when either `timeoutMs` elapses or `signal` aborts (if provided).
 * Does not rely on `AbortSignal.timeout` / `AbortSignal.any` so behavior is consistent
 * across runtimes (older browsers, test mocks, etc.).
 */
export function mergeAbortWithTimeout(
  signal: AbortSignal | null | undefined,
  timeoutMs: number
): AbortSignal {
  const controller = new AbortController();

  let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    timer = undefined;
    controller.abort();
  }, timeoutMs);

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  if (signal) {
    if (signal.aborted) {
      clearTimer();
      controller.abort();
    } else {
      signal.addEventListener(
        "abort",
        () => {
          clearTimer();
          controller.abort();
        },
        { once: true }
      );
    }
  }

  return controller.signal;
}
