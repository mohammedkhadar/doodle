import { Message, CreateMessagePayload } from "@/types/message";

const API_BASE_PATH = "/api/messages";

interface FetchMessagesOptions {
  limit?: number;
  after?: string;
  before?: string;
}

/** Normalize API payloads: prefer `_id`, fall back to `id` (do not overwrite a valid `id` with undefined). */
function normalizeMessage(raw: Record<string, unknown>, index: number): Message {
  const rawId = raw._id ?? raw.id;
  const id =
    rawId != null && String(rawId) !== ""
      ? String(rawId)
      : `local-${index}-${String(raw.createdAt ?? "")}-${String(raw.message ?? "").slice(0, 24)}`;

  return {
    id,
    message: String(raw.message ?? ""),
    author: String(raw.author ?? ""),
    createdAt: String(raw.createdAt ?? ""),
  };
}

function unwrapMessageList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.messages)) return o.messages;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

async function fetchMessages(options: FetchMessagesOptions = {}): Promise<Message[]> {
  const params = new URLSearchParams();

  if (options.limit) params.append("limit", options.limit.toString());
  if (options.after) params.append("after", options.after);
  if (options.before) params.append("before", options.before);

  const url = `${API_BASE_PATH}${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  const payload = await response.json();
  const list = unwrapMessageList(payload);
  return list.map((item, index) => normalizeMessage(item as Record<string, unknown>, index));
}

async function createMessage(payload: CreateMessagePayload): Promise<Message> {
  const response = await fetch(API_BASE_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create message: ${response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return normalizeMessage(data, 0);
}

export { fetchMessages, createMessage };
