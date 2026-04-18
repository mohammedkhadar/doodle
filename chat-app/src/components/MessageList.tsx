"use client";

import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Message } from "@/types/message";
import { GAP } from "@/lib/constants";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageState } from "@/components/MessageState";
import { useScrollCoordinator } from "@/hooks/useScrollCoordinator";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // TanStack Virtual is intentionally used here for large lists, and the
  // React Compiler warning is expected with this hook's API surface.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 90,
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? index,
    measureElement: (el) => el.getBoundingClientRect().height + GAP,
  });

  const { handleScroll } = useScrollCoordinator({
    virtualizer,
    scrollRef,
    innerRef,
    messageCount: messages.length,
    scrollToEndSignal,
    loadMoreSignal,
    hasMore,
    isLoadingMore,
    onLoadMore,
  });

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
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 h-full overflow-y-auto pt-6 pb-[calc(16px+3.5rem)]"
    >
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 rounded-full border-2 border-[#3498db] border-t-transparent animate-spin" />
        </div>
      )}
      <div
        ref={innerRef}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={message.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageBubble
                message={message}
                isOwnMessage={isOwnMessage(message.author)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
