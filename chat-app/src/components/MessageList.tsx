"use client";

import { useRef, useMemo, useEffect, useLayoutEffect, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Message } from "@/types/message";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageState } from "@/components/MessageState";

/** Stable baseline so prepends can decrease `firstItemIndex` while staying positive (Virtuoso). */
const INITIAL_FIRST_ITEM_INDEX = 1_000_000;

/** How far from the bottom still counts as “at bottom” (footer + input overlap). */
const AT_BOTTOM_THRESHOLD_PX = 120;

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  activeAuthor: string;
  onLoadMore: () => void;
  /** Increment after a successful send or initial load to scroll the list to the latest message. */
  scrollToEndSignal: number;
}

export function MessageList({
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  activeAuthor,
  onLoadMore,
  scrollToEndSignal,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [firstItemIndex, setFirstItemIndex] = useState(INITIAL_FIRST_ITEM_INDEX);
  /** Previous `messages[0].id` — used to detect prepends and shift `firstItemIndex`. */
  const prevHeadIdRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  const firstItemIndexRef = useRef(firstItemIndex);

  useLayoutEffect(() => {
    messagesRef.current = messages;
    firstItemIndexRef.current = firstItemIndex;
  }, [messages, firstItemIndex]);

  useEffect(() => {
    if (messages.length === 0) {
      prevHeadIdRef.current = null;
      // Reset baseline when the thread clears so the next non-empty mount matches Virtuoso indices.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync when `messages` becomes empty
      setFirstItemIndex(INITIAL_FIRST_ITEM_INDEX);
      return;
    }
    const headId = messages[0].id;
    if (prevHeadIdRef.current === null) {
      prevHeadIdRef.current = headId;
      return;
    }
    if (headId !== prevHeadIdRef.current) {
      const previousHeadIndex = messages.findIndex((m) => m.id === prevHeadIdRef.current);
      if (previousHeadIndex > 0) {
        setFirstItemIndex((v) => v - previousHeadIndex);
      }
      prevHeadIdRef.current = headId;
    }
  }, [messages]);

  const isOwnMessage = useMemo(
    () =>
      activeAuthor.trim().length > 0
        ? (author: string) =>
            author.localeCompare(activeAuthor, undefined, {
              sensitivity: "accent",
              usage: "search",
            }) === 0
        : () => false,
    [activeAuthor]
  );

  // Only react to `scrollToEndSignal` (send / initial bump), not prepends — use refs for latest indices.
  useLayoutEffect(() => {
    if (scrollToEndSignal === 0) return;
    const msgs = messagesRef.current;
    if (msgs.length === 0) return;
    const list = virtuosoRef.current;
    if (!list) return;
    const lastGlobalIndex = firstItemIndexRef.current + msgs.length - 1;
    list.scrollToIndex({ index: lastGlobalIndex, align: "end", behavior: "auto" });
    list.autoscrollToBottom();
  }, [scrollToEndSignal]);

  if (isLoading && messages.length === 0) {
    return (
      <MessageState
        title="Loading messages"
        detail="Pulling the latest conversation into the canvas."
      />
    );
  }

  if (error && messages.length === 0) {
    return <MessageState title="Unable to load chat" detail={error} tone="error" />;
  }

  if (messages.length === 0) {
    return (
      <MessageState
        title="No messages yet"
        detail="Start the first note and it will appear on the board."
      />
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      data-testid="message-list"
      className="flex-1 h-full pt-6"
      data={messages}
      firstItemIndex={firstItemIndex}
      alignToBottom
      atBottomThreshold={AT_BOTTOM_THRESHOLD_PX}
      followOutput={(isAtBottom) => (isAtBottom ? "auto" : false)}
      atTopStateChange={(isAtTop) => {
        if (isAtTop && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      }}
      computeItemKey={(_, message) => message.id}
      components={{
        Header: () =>
          isLoadingMore ? (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 rounded-full border-2 border-[#3498db] border-t-transparent animate-spin" />
            </div>
          ) : null,
        Footer: () => <div className="h-[calc(16px+3.5rem)]" />,
      }}
      itemContent={(_, message) => (
        <div
          className={
            message.id === messages[messages.length - 1]?.id ? "pb-0" : "pb-4"
          }
        >
          <MessageBubble message={message} isOwnMessage={isOwnMessage(message.author)} />
        </div>
      )}
    />
  );
}
