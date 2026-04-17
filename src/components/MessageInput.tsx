"use client";

import { useState, KeyboardEvent } from "react";

interface MessageInputProps {
  activeAuthor: string;
  onAuthorChange: (author: string) => void;
  onSendMessage: (message: string, author: string) => Promise<void>;
  isSending: boolean;
}

export default function MessageInput({
  activeAuthor,
  onAuthorChange,
  onSendMessage,
  isSending,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedMessage = message.trim();
    const trimmedAuthor = activeAuthor.trim();

    if (!trimmedMessage) {
      setError("Please enter a message");
      return;
    }

    if (!trimmedAuthor) {
      setError("Please enter a sender name");
      return;
    }

    await onSendMessage(trimmedMessage, trimmedAuthor);
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[#2f82bf] bg-[#3498db] px-2 py-2 shadow-[0_-4px_18px_rgba(52,152,219,0.22)] sm:px-3"
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2">
        <div className="flex gap-3">
          <input
            type="text"
            value={activeAuthor}
            onChange={(e) => onAuthorChange(e.target.value)}
            disabled={isSending}
            placeholder="Sender"
            className="h-10 w-24 rounded-[4px] border border-[#8fc6ea] bg-white px-3 text-sm text-[#6f7581] placeholder:text-[#c4c8cc] focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-70 sm:w-32"
            aria-label="Sender name"
          />
          <textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            rows={1}
            className="min-h-10 flex-1 resize-none rounded-[4px] border border-[#8fc6ea] bg-white px-4 py-2.5 text-sm text-[#8b919a] placeholder:text-[#c4c8cc] focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={isSending || !message.trim() || !activeAuthor.trim()}
            className="h-10 rounded-[4px] bg-[#ff7f6b] px-5 text-sm font-medium text-white transition-colors hover:bg-[#ff705a] focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
          >
            {isSending ? (
              <div className="mx-auto h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              "Send"
            )}
          </button>
        </div>
        {error && (
          <p className="px-1 text-sm text-white" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
