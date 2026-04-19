"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateMessagePayload, Message } from "@/types/message";
import { createMessage, fetchMessages } from "@/lib/api";
import {
  MESSAGES_FEED_QUERY_KEY,
  MESSAGE_PAGE_SIZE,
  type MessagesFeed,
  appendSentMessage,
  fetchMessagesFeedSnapshot,
  prependOlderMessages,
} from "@/lib/messagesFeed";

const POLLING_INTERVAL = 5000;
const DEFAULT_AUTHOR = "You";
const AUTHOR_STORAGE_KEY = "chat-author";

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
    queryFn: () => fetchMessagesFeedSnapshot(queryClient, MESSAGE_PAGE_SIZE),
    staleTime: 0,
    refetchInterval: POLLING_INTERVAL,
  });

  const loadMoreMutation = useMutation({
    mutationFn: (before: string) =>
      fetchMessages({ limit: MESSAGE_PAGE_SIZE, before }),
    onSuccess: (olderBatch) => {
      queryClient.setQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY, (old) =>
        prependOlderMessages(old, olderBatch, MESSAGE_PAGE_SIZE)
      );
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
      queryClient.setQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY, (old) =>
        appendSentMessage(old, newMessage)
      );
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
        // sendMutation.error drives `error` via derived state
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
