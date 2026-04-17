"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "@/types/message";
import { fetchMessages, createMessage } from "@/lib/api";
import { MessageList } from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";

const POLLING_INTERVAL = 5000;
const DEFAULT_AUTHOR = "You";

function sortMessagesByDate(messages: Message[]) {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

/** Merge server fetch with local state so polling does not drop a message that is not in the latest API page yet. */
function mergeMessagesWithServer(server: Message[], previous: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of sortMessagesByDate(server)) {
    byId.set(m.id, m);
  }
  for (const m of previous) {
    if (!byId.has(m.id)) byId.set(m.id, m);
  }
  return sortMessagesByDate([...byId.values()]);
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeAuthor, setActiveAuthor] = useState(DEFAULT_AUTHOR);
  const [scrollToEndSignal, setScrollToEndSignal] = useState(0);
  const [loadMoreSignal, setLoadMoreSignal] = useState(0);
  const messagesRef = useRef<Message[]>([]);
  const didInitialScrollRef = useRef(false);
  messagesRef.current = messages;

  useEffect(() => {
    const storedAuthor = window.localStorage.getItem("chat-author")?.trim();

    if (storedAuthor) {
      setActiveAuthor(storedAuthor);
    }
  }, []);

  /**
   * Initial load (empty state): `before: now` asks for the latest window of messages.
   * Poll (we already have messages): `after: newest` fetches only newer rows so we do not
   * replace the view with an "oldest-first" page that omits the latest message.
   */
  const loadMessages = useCallback(async () => {
    try {
      const prev = messagesRef.current;
      const sorted = sortMessagesByDate(prev);
      const newest = sorted.length > 0 ? sorted[sorted.length - 1].createdAt : undefined;

      const data = await fetchMessages(
        newest
          ? { limit: 100, after: newest }
          : { limit: 100, before: new Date().toISOString() }
      );

      setMessages((state) => mergeMessagesWithServer(data, state));

      if (!newest) {
        setHasMore(data.length === 100);
      }

      if (error) setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load messages");
      }
    }
  }, [error]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const data = await fetchMessages({
        limit: 100,
        before: oldestMessage.createdAt,
      });

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => mergeMessagesWithServer(data, prev));
        setHasMore(data.length === 100);
        setLoadMoreSignal((v) => v + 1);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, messages]);

  useEffect(() => {
    const loadInitialMessages = async () => {
      setIsLoading(true);
      await loadMessages();
      setIsLoading(false);
    };

    loadInitialMessages();

    const intervalId = setInterval(loadMessages, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [loadMessages]);

  useEffect(() => {
    if (isLoading || messages.length === 0 || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    setScrollToEndSignal((v) => v + 1);
  }, [isLoading, messages.length]);

  const handleSendMessage = async (messageText: string, author: string) => {
    setIsSending(true);
    setError(null);

    try {
      const newMessage = await createMessage({
        message: messageText,
        author,
      });
      setActiveAuthor(author);
      window.localStorage.setItem("chat-author", author);
      setMessages((prev) => sortMessagesByDate([...prev, newMessage]));
      setScrollToEndSignal((v) => v + 1);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to send message");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="chat-wallpaper h-screen">
      <div className="mx-auto flex h-full w-full max-w-[640px] flex-col px-6">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          error={error}
          activeAuthor={activeAuthor}
          onLoadMore={loadMoreMessages}
          scrollToEndSignal={scrollToEndSignal}
          loadMoreSignal={loadMoreSignal}
        />
      </div>
      <MessageInput
        activeAuthor={activeAuthor}
        onSendMessage={handleSendMessage}
        isSending={isSending}
      />
    </div>
  );
}
