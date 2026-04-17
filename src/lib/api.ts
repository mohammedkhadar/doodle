import { Message, CreateMessagePayload } from "@/types/message";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const AUTH_TOKEN = process.env.NEXT_PUBLIC_AUTH_TOKEN || "super-secret-doodle-token";

interface FetchMessagesOptions {
  limit?: number;
  after?: string;
  before?: string;
}

async function fetchMessages(options: FetchMessagesOptions = {}): Promise<Message[]> {
  const params = new URLSearchParams();

  if (options.limit) params.append("limit", options.limit.toString());
  if (options.after) params.append("after", options.after);
  if (options.before) params.append("before", options.before);

  const url = `${API_BASE_URL}/api/v1/messages${params.toString() ? `?${params}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  const data = await response.json();
  return data.map((msg: { _id: string } & Omit<Message, 'id'>) => ({
    ...msg,
    id: msg._id,
  }));
}

async function createMessage(payload: CreateMessagePayload): Promise<Message> {
  const response = await fetch(`${API_BASE_URL}/api/v1/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create message: ${response.statusText}`);
  }

  const data = await response.json();
  return { ...data, id: data._id };
}

export { fetchMessages, createMessage };
