import type { QueryClient } from "@tanstack/react-query";
import { Message } from "@/types/message";
import { fetchMessages } from "@/lib/api";

export const MESSAGES_FEED_QUERY_KEY = ["messages", "feed"] as const;

export const MESSAGE_PAGE_SIZE = 100;

export interface MessagesFeed {
  messages: Message[];
  hasMoreOlder: boolean;
}

export function sortMessagesByDate(messages: Message[]): Message[] {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

/** First page: latest window before “now”. */
export function feedFromInitialBatch(batch: Message[], pageSize: number): MessagesFeed {
  return {
    messages: sortMessagesByDate(batch),
    hasMoreOlder: batch.length === pageSize,
  };
}

/**
 * Append poll results onto the latest cache, deduping by id.
 * Re-read `cacheAfterFetch` after the network gap so prepend/send updates are not lost.
 */
export function mergePollBatch(
  incomingBatch: Message[],
  options: {
    snapshotBeforeFetch: MessagesFeed | undefined;
    cacheAfterFetch: MessagesFeed | undefined;
    fallbackExisting: Message[];
  }
): MessagesFeed {
  const baseMessages =
    options.cacheAfterFetch?.messages ?? options.fallbackExisting;
  const seen = new Set(baseMessages.map((m) => m.id));
  const added = incomingBatch.filter((m) => !seen.has(m.id));
  return {
    messages: sortMessagesByDate([...baseMessages, ...added]),
    hasMoreOlder:
      options.cacheAfterFetch?.hasMoreOlder ??
      options.snapshotBeforeFetch?.hasMoreOlder ??
      true,
  };
}

/** Prepend older page for infinite scroll (load more). */
export function prependOlderMessages(
  old: MessagesFeed | undefined,
  olderBatch: Message[],
  pageSize: number
): MessagesFeed {
  const baseMessages = old?.messages ?? [];
  if (olderBatch.length === 0) {
    return { messages: baseMessages, hasMoreOlder: false };
  }
  const seen = new Set(baseMessages.map((m) => m.id));
  const olderOnly = olderBatch.filter((m) => !seen.has(m.id));
  return {
    messages: sortMessagesByDate([...olderOnly, ...baseMessages]),
    hasMoreOlder: olderBatch.length === pageSize,
  };
}

/** Append a message returned from POST / create. */
export function appendSentMessage(old: MessagesFeed | undefined, newMessage: Message): MessagesFeed {
  const base = old?.messages ?? [];
  return {
    messages: sortMessagesByDate([...base, newMessage]),
    hasMoreOlder: old?.hasMoreOlder ?? true,
  };
}

/** `before` cursor for the next older page, or `null` if load-more should not run. */
export function getLoadMoreBeforeCursor(feed: MessagesFeed | undefined): string | null {
  if (!feed?.hasMoreOlder || feed.messages.length === 0) return null;
  return feed.messages[0]?.createdAt ?? null;
}

/**
 * Sync query: initial page or poll for newer messages after `newest` timestamp.
 * Reads/writes via `queryClient` only through `getQueryData` for merge inputs.
 */
export async function fetchMessagesFeedSnapshot(
  queryClient: Pick<QueryClient, "getQueryData">,
  pageSize: number
): Promise<MessagesFeed> {
  const prevFeed = queryClient.getQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY);
  const existing = prevFeed?.messages ?? [];
  const sorted = sortMessagesByDate(existing);
  const newest = sorted.length > 0 ? sorted[sorted.length - 1].createdAt : undefined;

  if (!newest) {
    const batch = await fetchMessages({
      limit: pageSize,
      before: new Date().toISOString(),
    });
    return feedFromInitialBatch(batch, pageSize);
  }

  const batch = await fetchMessages({
    limit: pageSize,
    after: newest,
  });
  const latestFeed = queryClient.getQueryData<MessagesFeed>(MESSAGES_FEED_QUERY_KEY);
  return mergePollBatch(batch, {
    snapshotBeforeFetch: prevFeed,
    cacheAfterFetch: latestFeed,
    fallbackExisting: existing,
  });
}
