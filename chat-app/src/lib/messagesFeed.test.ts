import {
  appendSentMessage,
  feedFromInitialBatch,
  mergePollBatch,
  prependOlderMessages,
  sortMessagesByDate,
} from "@/lib/messagesFeed";
import { Message } from "@/types/message";

function msg(partial: Partial<Message> & Pick<Message, "id" | "createdAt">): Message {
  return {
    message: "x",
    author: "a",
    ...partial,
  };
}

describe("messagesFeed", () => {
  describe("sortMessagesByDate", () => {
    it("orders by createdAt ascending", () => {
      const a = msg({ id: "1", createdAt: "2026-04-18T10:00:00.000Z" });
      const b = msg({ id: "2", createdAt: "2026-04-18T11:00:00.000Z" });
      expect(sortMessagesByDate([b, a]).map((m) => m.id)).toEqual(["1", "2"]);
    });
  });

  describe("feedFromInitialBatch", () => {
    it("sets hasMoreOlder when batch fills page", () => {
      const batch = Array.from({ length: 100 }, (_, i) =>
        msg({ id: `m-${i}`, createdAt: `2026-04-18T10:${String(i).padStart(2, "0")}:00.000Z` })
      );
      const feed = feedFromInitialBatch(batch, 100);
      expect(feed.hasMoreOlder).toBe(true);
      expect(feed.messages).toHaveLength(100);
    });
  });

  describe("mergePollBatch", () => {
    it("dedupes by id and preserves cache updated during fetch", () => {
      const existing = [
        msg({ id: "a", createdAt: "2026-04-18T10:00:00.000Z" }),
        msg({ id: "b", createdAt: "2026-04-18T10:01:00.000Z" }),
      ];
      const incoming = [msg({ id: "c", createdAt: "2026-04-18T10:02:00.000Z" })];
      const duringFetch = {
        messages: [
          ...existing,
          msg({ id: "local", createdAt: "2026-04-18T10:01:30.000Z" }),
        ],
        hasMoreOlder: true,
      };
      const merged = mergePollBatch(incoming, {
        snapshotBeforeFetch: { messages: existing, hasMoreOlder: true },
        cacheAfterFetch: duringFetch,
        fallbackExisting: existing,
      });
      expect(merged.messages.map((m) => m.id)).toEqual(["a", "b", "local", "c"]);
      expect(merged.hasMoreOlder).toBe(true);
    });
  });

  describe("prependOlderMessages", () => {
    it("prepends older rows and clears hasMore when empty batch", () => {
      const old = {
        messages: [msg({ id: "m1", createdAt: "2026-04-18T10:00:00.000Z" })],
        hasMoreOlder: true,
      };
      const empty = prependOlderMessages(old, [], 100);
      expect(empty.hasMoreOlder).toBe(false);
      expect(empty.messages).toHaveLength(1);
    });
  });

  describe("appendSentMessage", () => {
    it("appends and keeps hasMoreOlder", () => {
      const old = {
        messages: [msg({ id: "m1", createdAt: "2026-04-18T10:00:00.000Z" })],
        hasMoreOlder: false,
      };
      const next = appendSentMessage(old, msg({ id: "m2", createdAt: "2026-04-18T10:05:00.000Z" }));
      expect(next.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
      expect(next.hasMoreOlder).toBe(false);
    });
  });
});
