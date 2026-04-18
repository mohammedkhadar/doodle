"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Virtualizer } from "@tanstack/react-virtual";
import { LOAD_MORE_THRESHOLD_PX, NEAR_BOTTOM_THRESHOLD_PX } from "@/lib/constants";

interface UseScrollCoordinatorOptions {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
  messageCount: number;
  /** Increment to force-scroll the list to the latest message (e.g. after send). */
  scrollToEndSignal: number;
  /** Increment after loading older messages; disables auto-scroll so the viewport stays anchored. */
  loadMoreSignal: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

/**
 * Centralizes every piece of scroll coordination for the message list:
 *   - tracking whether the viewport is near the bottom
 *   - auto-scrolling on new messages when the user is near the bottom
 *   - explicit scroll-to-end on send
 *   - anchoring (no auto-scroll) after load-more
 *   - ResizeObserver to stay pinned when bubble heights settle
 *   - rAF-coalesced scroll handler that also triggers load-more
 *
 * Returning a single `handleScroll` keeps the calling component free of
 * scroll-position bookkeeping.
 */
export function useScrollCoordinator({
  virtualizer,
  scrollRef,
  innerRef,
  messageCount,
  scrollToEndSignal,
  loadMoreSignal,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: UseScrollCoordinatorOptions) {
  const [isNearBottom, setIsNearBottomState] = useState(true);
  const isNearBottomRef = useRef(true);

  /** Single source of truth: updates ref and state together. */
  const setIsNearBottom = useCallback((value: boolean) => {
    isNearBottomRef.current = value;
    setIsNearBottomState((prev) => (prev === value ? prev : value));
  }, []);

  const scrollToLatest = useCallback(() => {
    if (messageCount === 0) return;
    virtualizer.scrollToIndex(messageCount - 1, { align: "end" });
  }, [messageCount, virtualizer]);

  // New messages while the user is near the bottom: snap to the end.
  useLayoutEffect(() => {
    if (!isNearBottom || messageCount === 0) return;
    scrollToLatest();
    // Bubbles can re-measure after images/fonts settle; re-run after two frames.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToLatest);
    });
    return () => cancelAnimationFrame(id);
  }, [isNearBottom, messageCount, scrollToLatest]);

  // Explicit scroll-to-end (send). The setState is intentional: it transitions
  // the user back into "near bottom" mode so subsequent polling auto-scrolls.
  useLayoutEffect(() => {
    if (scrollToEndSignal === 0 || messageCount === 0) return;
    scrollToLatest();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsNearBottom(true);
  }, [scrollToEndSignal, messageCount, scrollToLatest, setIsNearBottom]);

  // Load-more: stay anchored to the user's current position. The setState is
  // intentional — it disables the auto-scroll effect so older messages do not
  // yank the viewport to the bottom.
  useLayoutEffect(() => {
    if (loadMoreSignal === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsNearBottom(false);
  }, [loadMoreSignal, setIsNearBottom]);

  // Keep pinned when inner content resizes (images, late layout).
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!isNearBottomRef.current || messageCount === 0) return;
      virtualizer.scrollToIndex(messageCount - 1, { align: "end" });
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [innerRef, messageCount, virtualizer]);

  // rAF-coalesced scroll handler. Scroll events fire ~60×/sec; we only need
  // one recomputation per frame.
  const rafRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const nearBottom =
        scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_THRESHOLD_PX;
      setIsNearBottom(nearBottom);
      if (scrollTop < LOAD_MORE_THRESHOLD_PX && hasMore && !isLoadingMore) {
        onLoadMore();
      }
    });
  }, [scrollRef, setIsNearBottom, hasMore, isLoadingMore, onLoadMore]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  return { handleScroll, isNearBottom };
}
