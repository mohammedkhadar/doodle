"use client";

import { useRef, useMemo, useEffect, useLayoutEffect, useCallback } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Message } from "@/types/message";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageState } from "@/components/MessageState";

const BOTTOM_THRESHOLD_PX = 120;
const PREPEND_HEIGHT_PASSES_TO_IGNORE = 2;
const VIEWPORT_OVERSCAN_PX = 200;

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
  const skipNextFollowRef = useRef(false);
  const ignoredHeightPassesRef = useRef(0);

  useEffect(() => {
    if (loadMoreSignal > 0) {
      // Prepends should preserve viewport position, not yank to bottom.
      skipNextFollowRef.current = true;
      ignoredHeightPassesRef.current = PREPEND_HEIGHT_PASSES_TO_IGNORE;
    }
  }, [loadMoreSignal]);

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

  const scrollToLastMessage = useCallback(() => {
    if (messages.length === 0) return;
    const list = virtuosoRef.current;
    if (!list) return;
    const lastIndex = messages.length - 1;
    list.scrollToIndex({ index: lastIndex, align: "end", behavior: "auto" });
    list.autoscrollToBottom();
  }, [messages.length]);

  const handleListHeightChange = () => {
    if (ignoredHeightPassesRef.current > 0) {
      ignoredHeightPassesRef.current -= 1;
      return;
    }
    if (!isAtBottomRef.current) return;
    virtuosoRef.current?.autoscrollToBottom();
  };

  const handleFollowOutput = (isAtBottom: boolean) => {
    if (skipNextFollowRef.current) {
      skipNextFollowRef.current = false;
      return false;
    }
    return isAtBottom ? "auto" : false;
  };

  useLayoutEffect(() => {
    if (scrollToEndSignal === 0 || messages.length === 0) return;
    isAtBottomRef.current = true;
    scrollToLastMessage();
    queueMicrotask(scrollToLastMessage);
  }, [scrollToEndSignal, messages.length, scrollToLastMessage]);

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
      alignToBottom
      increaseViewportBy={VIEWPORT_OVERSCAN_PX}
      atBottomThreshold={BOTTOM_THRESHOLD_PX}
      atBottomStateChange={(isAtBottom) => {
        isAtBottomRef.current = isAtBottom;
      }}
      totalListHeightChanged={handleListHeightChange}
      followOutput={handleFollowOutput}
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
