"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeAuthor, setActiveAuthor] = useState(DEFAULT_AUTHOR);

  useEffect(() => {
    const storedAuthor = window.localStorage.getItem("chat-author")?.trim();

    if (storedAuthor) {
      setActiveAuthor(storedAuthor);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchMessages({ limit: 100 });
      setMessages(sortMessagesByDate(data));
      setHasMore(data.length === 100);
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
        setMessages([...data, ...messages]);
        setHasMore(data.length === 100);
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

  const handleAuthorChange = (author: string) => {
    setActiveAuthor(author);
    window.localStorage.setItem("chat-author", author);
  };

  const handleSendMessage = async (messageText: string, author: string) => {
    setIsSending(true);
    setError(null);

    try {
      const newMessage = await createMessage({
        message: messageText,
        author,
      });
      setMessages((prev) => [...prev, newMessage]);
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
      <div className="mx-auto flex h-full w-full max-w-[1280px] flex-col">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          error={error}
          activeAuthor={activeAuthor}
          onLoadMore={loadMoreMessages}
        />
      </div>
      <MessageInput
        activeAuthor={activeAuthor}
        onAuthorChange={handleAuthorChange}
        onSendMessage={handleSendMessage}
        isSending={isSending}
      />
    </div>
  );
}
