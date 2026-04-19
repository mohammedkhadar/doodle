"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "@/types/message";
import { fetchMessages, createMessage } from "@/lib/api";

const POLLING_INTERVAL = 5000;
const DEFAULT_AUTHOR = "You";
const PAGE_SIZE = 100;
const AUTHOR_STORAGE_KEY = "chat-author";

function sortMessagesByDate(messages: Message[]): Message[] {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

/** Merge server fetch with local state so polling does not drop a message not in the latest API page yet. */
function mergeMessagesWithServer(server: Message[], previous: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const message of sortMessagesByDate(server)) {
    byId.set(message.id, message);
  }
  for (const message of previous) {
    if (!byId.has(message.id)) byId.set(message.id, message);
  }
  return sortMessagesByDate([...byId.values()]);
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface UseChatMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  isSending: boolean;
  hasMore: boolean;
  activeAuthor: string;
  scrollToEndSignal: number;
  loadMoreMessages: () => Promise<void>;
  handleSendMessage: (messageText: string, author: string) => Promise<void>;
}

export function useChatMessages(): UseChatMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeAuthor, setActiveAuthor] = useState(DEFAULT_AUTHOR);
  const [scrollToEndSignal, setScrollToEndSignal] = useState(0);
  const messagesRef = useRef<Message[]>([]);
  const didInitialScrollRef = useRef(false);
  messagesRef.current = messages;

  useEffect(() => {
    const storedAuthor = window.localStorage.getItem(AUTHOR_STORAGE_KEY)?.trim();
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
      const previous = messagesRef.current;
      const sorted = sortMessagesByDate(previous);
      const newest = sorted.length > 0 ? sorted[sorted.length - 1].createdAt : undefined;

      const data = await fetchMessages(
        newest
          ? { limit: PAGE_SIZE, after: newest }
          : { limit: PAGE_SIZE, before: new Date().toISOString() }
      );

      setMessages((state) => mergeMessagesWithServer(data, state));
      if (!newest) {
        setHasMore(data.length === PAGE_SIZE);
      }
      setError((current) => (current ? null : current));
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Failed to load messages"));
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const data = await fetchMessages({
        limit: PAGE_SIZE,
        before: oldestMessage.createdAt,
      });

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setMessages((previous) => mergeMessagesWithServer(data, previous));
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (loadMoreError) {
      console.error("Failed to load more messages:", loadMoreError);
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

    void loadInitialMessages();
    const intervalId = setInterval(() => {
      void loadMessages();
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [loadMessages]);

  useEffect(() => {
    if (isLoading || messages.length === 0 || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    setScrollToEndSignal((value) => value + 1);
  }, [isLoading, messages.length]);

  const handleSendMessage = useCallback(async (messageText: string, author: string) => {
    setIsSending(true);
    setError(null);

    try {
      const newMessage = await createMessage({
        message: messageText,
        author,
      });
      setActiveAuthor(author);
      window.localStorage.setItem(AUTHOR_STORAGE_KEY, author);
      setMessages((previous) => sortMessagesByDate([...previous, newMessage]));
      setScrollToEndSignal((value) => value + 1);
    } catch (sendError) {
      setError(toErrorMessage(sendError, "Failed to send message"));
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    isLoadingMore,
    error,
    isSending,
    hasMore,
    activeAuthor,
    scrollToEndSignal,
    loadMoreMessages,
    handleSendMessage,
  };
}
