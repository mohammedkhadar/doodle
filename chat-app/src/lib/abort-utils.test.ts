import { mergeAbortWithTimeout } from "@/lib/abort-utils";

describe("mergeAbortWithTimeout", () => {
  it("aborts after the given delay when no parent signal", async () => {
    jest.useFakeTimers();
    const merged = mergeAbortWithTimeout(undefined, 1000);
    expect(merged.aborted).toBe(false);
    jest.advanceTimersByTime(1000);
    expect(merged.aborted).toBe(true);
    jest.useRealTimers();
  });

  it("aborts when the parent signal aborts and clears the timer", async () => {
    jest.useFakeTimers();
    const parent = new AbortController();
    const merged = mergeAbortWithTimeout(parent.signal, 10_000);
    expect(merged.aborted).toBe(false);
    parent.abort();
    expect(merged.aborted).toBe(true);
    jest.advanceTimersByTime(10_000);
    expect(merged.aborted).toBe(true);
    jest.useRealTimers();
  });
});
