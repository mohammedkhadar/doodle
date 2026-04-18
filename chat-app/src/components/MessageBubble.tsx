"use client";

import { memo } from "react";
import { Message } from "@/types/message";
import { decodeEntities, formatTimestamp } from "@/lib/format";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex w-full min-w-0 ${isOwnMessage ? "justify-end" : "justify-start"}`}
    >
      <article
        className={[
          "box-border w-fit min-w-0 max-w-[420px] rounded-[3px] border px-4 py-4",
          isOwnMessage
            ? "border-[#e0d28a] bg-[#fff9c4] text-[#333333]"
            : "border-[#d8d8d8] bg-white text-[#333333]",
        ].join(" ")}
      >
        {!isOwnMessage && (
          <p className="text-[12px] leading-[1.2] text-[#999999]">
            {decodeEntities(message.author)}
          </p>
        )}
        <p
          className={`break-words [overflow-wrap:anywhere] ${
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
