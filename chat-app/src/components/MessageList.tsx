"use client";

import { useRef, useEffect, useMemo, memo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Message } from "@/types/message";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

function decodeEntities(text: string) {
  return text
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);

  return (
    date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

const MessageBubble = memo(function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <div className={`flex w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <article
        className={[
          "rounded-none border px-4 py-3",
          isOwnMessage
            ? "max-w-[min(42rem,92%)] border-[#e0d28a] bg-[#fff9c4] text-[#333333]"
            : "w-full max-w-[18.5rem] border-[#d8d8d8] bg-white text-[#333333]",
        ].join(" ")}
      >
        {!isOwnMessage && (
          <p className="text-[12px] leading-[1.2] text-[#999999]">
            {decodeEntities(message.author)}
          </p>
        )}
        <p
          className={`break-words ${
            isOwnMessage
              ? "text-[16px] leading-[1.45]"
              : "mt-2 text-[16px] leading-[1.4]"
          }`}
        >
          {decodeEntities(message.message)}
        </p>
        <p
          className={`mt-3 text-[12px] ${
            isOwnMessage ? "text-right text-[#8a7968]" : "text-[#999999]"
          }`}
        >
          {formatTimestamp(message.createdAt)}
        </p>
      </article>
    </div>
  );
});

function MessageState({
  title,
  detail,
  tone = "neutral",
}: {
  title: string;
  detail: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div
        className={[
          "max-w-md rounded-[6px] border bg-white/90 px-6 py-5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
          tone === "error" ? "border-[#ff9e8d]" : "border-[#d8d8d8]",
        ].join(" ")}
      >
        <p className="text-lg font-medium text-[#6d7380]">{title}</p>
        <p className="mt-2 text-sm text-[#9097a0]">{detail}</p>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  activeAuthor: string;
  onLoadMore: () => void;
}

const GAP = 16;

export function MessageList({
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  activeAuthor,
  onLoadMore,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // TanStack Virtual is intentionally used here for large lists, and the
  // React Compiler warning is expected with this hook's API surface.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 90,
    overscan: 10,
    measureElement: (el) => el.getBoundingClientRect().height + GAP,
  });

  useEffect(() => {
    if (isNearBottom && scrollRef.current && messages.length > 0) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages.length, isNearBottom]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setIsNearBottom(scrollHeight - scrollTop - clientHeight < 100);

      if (scrollTop < 50 && hasMore && !isLoadingMore) {
        onLoadMore();
      }
    }
  };

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
      className="flex-1 h-full overflow-y-auto px-5 pb-24 pt-6 sm:px-10 sm:pb-24 lg:px-20"
    >
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 rounded-full border-2 border-[#3498db] border-t-transparent animate-spin" />
        </div>
      )}
      <div
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
