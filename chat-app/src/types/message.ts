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

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
