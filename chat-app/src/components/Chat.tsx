"use client";

import { MessageList } from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import { useChatMessages } from "@/hooks/useChatMessages";

export default function Chat() {
  const {
    messages,
    isLoading,
    isLoadingMore,
    error,
    isSending,
    hasMore,
    activeAuthor,
    scrollToEndSignal,
    loadMoreSignal,
    loadMoreMessages,
    handleSendMessage,
  } = useChatMessages();

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
