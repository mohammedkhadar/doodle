export interface Message {
  id: string;
  message: string;
  author: string;
  createdAt: string;
}

export interface CreateMessagePayload {
  message: string;
  author: string;
}
