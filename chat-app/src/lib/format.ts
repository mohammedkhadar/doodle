/**
 * Lightweight HTML entity decoder for the handful of entities the chat API
 * emits. Intentionally avoids DOMParser: a small replace map is ~100× faster
 * and does not require a DOM, making it safe to run during render.
 */
const ENTITIES: Record<string, string> = {
  "&#39;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
};

const ENTITY_REGEX = /&(?:#39|quot|amp|lt|gt);/g;

export function decodeEntities(text: string): string {
  return text.replace(ENTITY_REGEX, (match) => ENTITIES[match] ?? match);
}

/**
 * Memoized timestamp formatter. `formatTimestamp` runs once per `MessageBubble`
 * render, so caching by the raw ISO string avoids re-parsing `new Date(...)`
 * and re-running the Intl formatters for messages that have already been seen.
 *
 * The cache is unbounded in theory, but each entry is ~40 bytes and the number
 * of unique timestamps is bounded by the number of messages the session sees.
 */
const timestampCache = new Map<string, string>();

export function formatTimestamp(dateString: string): string {
  const cached = timestampCache.get(dateString);
  if (cached !== undefined) return cached;

  const date = new Date(dateString);
  const formatted =
    date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  timestampCache.set(dateString, formatted);
  return formatted;
}

/** Exposed for tests. Not part of the public API. */
export function __resetFormatCaches() {
  timestampCache.clear();
}
