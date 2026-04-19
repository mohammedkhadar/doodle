import { Message, CreateMessagePayload } from "@/types/message";

const API_BASE_PATH = "/api/messages";
const JSON_CONTENT_TYPE = "application/json";

interface FetchMessagesOptions {
  limit?: number;
  after?: string;
  before?: string;
}

type JsonObject = Record<string, unknown>;

/** Normalize API payloads: prefer `_id`, fall back to `id` (do not overwrite a valid `id` with undefined). */
function normalizeMessage(raw: JsonObject, index: number): Message {
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

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" ? (value as JsonObject) : null;
}

function toMessageRecord(value: unknown): JsonObject {
  return asObject(value) ?? {};
}

function unwrapMessageList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const o = asObject(payload);
  if (o) {
    if (Array.isArray(o.messages)) return o.messages;
    if (Array.isArray(o.data)) return o.data;
  }
  return [];
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  errorPrefix: string
): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const statusDetail = response.statusText || `HTTP ${response.status}`;
    throw new Error(`${errorPrefix}: ${statusDetail}`);
  }

  return (await response.json()) as T;
}

function buildMessagesUrl(options: FetchMessagesOptions): string {
  const params = new URLSearchParams();

  if (options.limit) params.append("limit", options.limit.toString());
  if (options.after) params.append("after", options.after);
  if (options.before) params.append("before", options.before);

  return `${API_BASE_PATH}${params.toString() ? `?${params}` : ""}`;
}

async function fetchMessages(options: FetchMessagesOptions = {}): Promise<Message[]> {
  const payload = await requestJson<unknown>(
    buildMessagesUrl(options),
    { method: "GET" },
    "Failed to fetch messages"
  );

  const list = unwrapMessageList(payload);
  return list.map((item, index) => normalizeMessage(toMessageRecord(item), index));
}

async function createMessage(payload: CreateMessagePayload): Promise<Message> {
  const data = await requestJson<unknown>(
    API_BASE_PATH,
    {
      method: "POST",
      headers: {
        "Content-Type": JSON_CONTENT_TYPE,
      },
      body: JSON.stringify(payload),
    },
    "Failed to create message"
  );
  return normalizeMessage(toMessageRecord(data), 0);
}

export { fetchMessages, createMessage };
