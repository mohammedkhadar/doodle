"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateMessagePayload, Message } from "@/types/message";
import { fetchMessages, createMessage } from "@/lib/api";

const POLLING_INTERVAL = 5000;
const DEFAULT_AUTHOR = "You";
const PAGE_SIZE = 100;
const AUTHOR_STORAGE_KEY = "chat-author";

const MESSAGES_FEED_QUERY_KEY = ["messages", "feed"] as const;

interface MessagesFeed {
  messages: Message[];
  hasMoreOlder: boolean;
}

function sortMessagesByDate(messages: Message[]): Message[] {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
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
  const queryClient = useQueryClient();
  const [activeAuthor, setActiveAuthor] = useState(DEFAULT_AUTHOR);
  const [scrollToEndSignal, setScrollToEndSignal] = useState(0);
  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    const storedAuthor = window.localStorage.getItem(AUTHOR_STORAGE_KEY)?.trim();
    if (storedAuthor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate author after mount (avoid SSR/localStorage mismatch)
      setActiveAuthor(storedAuthor);
    }
  }, []);

  const messagesQuery = useQuery({
    queryKey: MESSAGES_FEED_QUERY_KEY,
    queryFn: async (): Promise<MessagesFeed> => {
      const prevFeed = queryClient.getQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY);
      const existing = prevFeed?.messages ?? [];
      const sorted = sortMessagesByDate(existing);
      const newest = sorted.length > 0 ? sorted[sorted.length - 1].createdAt : undefined;

      if (!newest) {
        const batch = await fetchMessages({
          limit: PAGE_SIZE,
          before: new Date().toISOString(),
        });
        return {
          messages: sortMessagesByDate(batch),
          hasMoreOlder: batch.length === PAGE_SIZE,
        };
      }

      const batch = await fetchMessages({
        limit: PAGE_SIZE,
        after: newest,
      });
      // Re-read cache after the network gap so mutations (prepend / send) are not
      // overwritten by a stale snapshot taken before `await`.
      const latestFeed = queryClient.getQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY);
      const baseMessages = latestFeed?.messages ?? existing;
      const seen = new Set(baseMessages.map((m) => m.id));
      const added = batch.filter((m) => !seen.has(m.id));
      return {
        messages: sortMessagesByDate([...baseMessages, ...added]),
        hasMoreOlder: latestFeed?.hasMoreOlder ?? prevFeed?.hasMoreOlder ?? true,
      };
    },
    staleTime: 0,
    refetchInterval: POLLING_INTERVAL,
  });

  const loadMoreMutation = useMutation({
    mutationFn: (before: string) =>
      fetchMessages({ limit: PAGE_SIZE, before }),
    onSuccess: (olderBatch) => {
      queryClient.setQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY, (old) => {
        const baseMessages = old?.messages ?? [];
        if (olderBatch.length === 0) {
          return { messages: baseMessages, hasMoreOlder: false };
        }
        const seen = new Set(baseMessages.map((m) => m.id));
        const olderOnly = olderBatch.filter((m) => !seen.has(m.id));
        return {
          messages: sortMessagesByDate([...olderOnly, ...baseMessages]),
          hasMoreOlder: olderBatch.length === PAGE_SIZE,
        };
      });
    },
    onError: (loadMoreError) => {
      console.error("Failed to load more messages:", loadMoreError);
    },
  });

  const sendMutation = useMutation({
    mutationFn: (payload: CreateMessagePayload) => createMessage(payload),
    onSuccess: (newMessage, variables) => {
      setActiveAuthor(variables.author);
      window.localStorage.setItem(AUTHOR_STORAGE_KEY, variables.author);
      queryClient.setQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY, (old) => {
        const base = old?.messages ?? [];
        return {
          messages: sortMessagesByDate([...base, newMessage]),
          hasMoreOlder: old?.hasMoreOlder ?? true,
        };
      });
      setScrollToEndSignal((value) => value + 1);
    },
  });

  const loadMoreMessages = useCallback(async () => {
    if (loadMoreMutation.isPending) return;
    const feed = queryClient.getQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY);
    if (!feed?.hasMoreOlder) return;
    const oldest = feed.messages[0];
    if (!oldest) return;
    try {
      await loadMoreMutation.mutateAsync(oldest.createdAt);
    } catch {
      // onError already logged
    }
  }, [loadMoreMutation, queryClient]);

  const feed = messagesQuery.data;
  const messages = feed?.messages ?? [];
  const hasMore = feed?.hasMoreOlder ?? true;

  const isLoading = messagesQuery.isPending;

  const loadError =
    messagesQuery.isError && messagesQuery.error
      ? toErrorMessage(messagesQuery.error, "Failed to load messages")
      : null;
  const sendError =
    sendMutation.isError && sendMutation.error
      ? toErrorMessage(sendMutation.error, "Failed to send message")
      : null;
  const error = sendError ?? loadError;

  useEffect(() => {
    if (isLoading || messages.length === 0 || didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time scroll after first non-empty load
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
