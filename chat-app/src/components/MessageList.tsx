"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Message } from "@/types/message";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageState } from "@/components/MessageState";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  activeAuthor: string;
  onLoadMore: () => void;
  /** Increment after a successful send to scroll the list to the latest message. */
  scrollToEndSignal: number;
  /** Increment after loading older messages (should NOT auto-scroll). */
  loadMoreSignal: number;
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
  loadMoreSignal,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isAtBottomRef = useRef(true);
  const previousMessageCountRef = useRef(messages.length);
  const skipAutoScrollRef = useRef(false);

  const scrollToLatest = useCallback(() => {
    if (messages.length === 0) return;
    const latestIndex = messages.length - 1;
    virtuosoRef.current?.scrollToIndex({
      index: latestIndex,
      align: "end",
      behavior: "auto",
    });
    // Re-run after layout settles so multiline bubbles are fully visible.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: latestIndex,
          align: "end",
          behavior: "auto",
        });
      });
    });
  }, [messages.length]);

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

  useEffect(() => {
    if (loadMoreSignal > 0) {
      // Loading older messages prepends entries; keep viewport anchored.
      skipAutoScrollRef.current = true;
    }
  }, [loadMoreSignal]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    if (messages.length === 0 || previousCount === 0 || messages.length <= previousCount) {
      return;
    }

    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }

    if (isAtBottomRef.current) {
      scrollToLatest();
    }
  }, [messages.length, scrollToLatest]);

  useEffect(() => {
    if (scrollToEndSignal === 0 || messages.length === 0) return;
    isAtBottomRef.current = true;
    scrollToLatest();
  }, [scrollToEndSignal, messages.length, scrollToLatest]);

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
      initialTopMostItemIndex={Math.max(messages.length - 1, 0)}
      atBottomStateChange={(isAtBottom) => {
        isAtBottomRef.current = isAtBottom;
      }}
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
      itemContent={(index, message) => (
        <div className={index === messages.length - 1 ? "pb-0" : "pb-4"}>
          <MessageBubble message={message} isOwnMessage={isOwnMessage(message.author)} />
        </div>
      )}
    />
  );
}
