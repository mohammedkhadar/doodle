"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreateMessagePayload, Message } from "@/types/message";
import { fetchMessages, createMessage } from "@/lib/api";

const POLLING_INTERVAL = 5000;
const DEFAULT_AUTHOR = "You";
const PAGE_SIZE = 100;
const AUTHOR_STORAGE_KEY = "chat-author";

const MESSAGES_SYNC_QUERY_KEY = ["messages", "sync"] as const;

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
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeAuthor, setActiveAuthor] = useState(DEFAULT_AUTHOR);
  const [scrollToEndSignal, setScrollToEndSignal] = useState(0);
  const messagesRef = useRef<Message[]>([]);
  const didInitialScrollRef = useRef(false);
  // Mirror latest messages for the sync queryFn; assignment each render is intentional.
  // eslint-disable-next-line react-hooks/refs -- ref mirrors state for async query closure
  messagesRef.current = messages;

  useEffect(() => {
    const storedAuthor = window.localStorage.getItem(AUTHOR_STORAGE_KEY)?.trim();
    if (storedAuthor) {
      setActiveAuthor(storedAuthor);
    }
  }, []);

  const messagesQuery = useQuery({
    queryKey: MESSAGES_SYNC_QUERY_KEY,
    queryFn: async () => {
      const previous = messagesRef.current;
      const sorted = sortMessagesByDate(previous);
      const newest = sorted.length > 0 ? sorted[sorted.length - 1].createdAt : undefined;

      const batch = await fetchMessages(
        newest
          ? { limit: PAGE_SIZE, after: newest }
          : { limit: PAGE_SIZE, before: new Date().toISOString() }
      );

      return { batch, hadNewest: Boolean(newest) };
    },
    staleTime: 0,
    refetchInterval: POLLING_INTERVAL,
  });

  useLayoutEffect(() => {
    if (messagesQuery.data === undefined) return;
    const { batch, hadNewest } = messagesQuery.data;
    setMessages((state) => mergeMessagesWithServer(batch, state));
    if (!hadNewest) {
      setHasMore(batch.length === PAGE_SIZE);
    }
    setError(null);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!messagesQuery.isError || !messagesQuery.error) return;
    setError(toErrorMessage(messagesQuery.error, "Failed to load messages"));
  }, [messagesQuery.isError, messagesQuery.error]);

  const loadMoreMutation = useMutation({
    mutationFn: (before: string) =>
      fetchMessages({ limit: PAGE_SIZE, before }),
    onSuccess: (data) => {
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setMessages((previous) => mergeMessagesWithServer(data, previous));
        setHasMore(data.length === PAGE_SIZE);
      }
    },
    onError: (loadMoreError) => {
      console.error("Failed to load more messages:", loadMoreError);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (payload: CreateMessagePayload) => createMessage(payload),
    onMutate: () => {
      setError(null);
    },
    onSuccess: (newMessage, variables) => {
      setActiveAuthor(variables.author);
      window.localStorage.setItem(AUTHOR_STORAGE_KEY, variables.author);
      setMessages((previous) => sortMessagesByDate([...previous, newMessage]));
      setScrollToEndSignal((value) => value + 1);
    },
    onError: (sendError) => {
      setError(toErrorMessage(sendError, "Failed to send message"));
    },
  });

  const loadMoreMessages = useCallback(async () => {
    if (loadMoreMutation.isPending || !hasMore) return;
    const oldest = messagesRef.current[0];
    if (!oldest) return;
    try {
      await loadMoreMutation.mutateAsync(oldest.createdAt);
    } catch {
      // onError already logged
    }
  }, [hasMore, loadMoreMutation]);

  const isLoading = messagesQuery.isPending;

  useEffect(() => {
    if (isLoading || messages.length === 0 || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    setScrollToEndSignal((value) => value + 1);
  }, [isLoading, messages.length]);

  const handleSendMessage = useCallback(
    async (messageText: string, author: string) => {
      try {
        await sendMutation.mutateAsync({ message: messageText, author });
      } catch {
        // surfaced via setError in onError
      }
    },
    [sendMutation]
  );

  return {
    messages,
    isLoading,
    isLoadingMore: loadMoreMutation.isPending,
    error,
    isSending: sendMutation.isPending,
    hasMore,
    activeAuthor,
    scrollToEndSignal,
    loadMoreMessages,
    handleSendMessage,
  };
}
