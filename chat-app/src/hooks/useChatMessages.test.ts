import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { fetchMessages, createMessage } from "@/lib/api";
import { Message } from "@/types/message";

jest.mock("@/lib/api", () => ({
  fetchMessages: jest.fn(),
  createMessage: jest.fn(),
}));

const mockedFetchMessages = fetchMessages as jest.MockedFunction<typeof fetchMessages>;
const mockedCreateMessage = createMessage as jest.MockedFunction<typeof createMessage>;

function message(overrides: Partial<Message>): Message {
  return {
    id: "id-1",
    message: "hello",
    author: "alice",
    createdAt: "2026-04-18T10:00:00.000Z",
    ...overrides,
  };
}

describe("useChatMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads initial messages and restores active author from localStorage", async () => {
    window.localStorage.setItem("chat-author", "  Zed  ");
    mockedFetchMessages.mockResolvedValueOnce([
      message({ id: "m2", createdAt: "2026-04-18T10:01:00.000Z" }),
      message({ id: "m1", createdAt: "2026-04-18T10:00:00.000Z" }),
    ]);

    const { result } = renderHook(() => useChatMessages());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeAuthor).toBe("Zed");
    expect(result.current.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(result.current.scrollToEndSignal).toBe(1);
    expect(mockedFetchMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100,
        before: expect.any(String),
      })
    );
  });

  it("polls for newer messages using after newest timestamp", async () => {
    mockedFetchMessages
      .mockResolvedValueOnce([message({ id: "m1", createdAt: "2026-04-18T10:00:00.000Z" })])
      .mockResolvedValueOnce([message({ id: "m2", createdAt: "2026-04-18T10:01:00.000Z" })]);

    const { result } = renderHook(() => useChatMessages());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockedFetchMessages).toHaveBeenNthCalledWith(2, {
        limit: 100,
        after: "2026-04-18T10:00:00.000Z",
      });
    });

    expect(result.current.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("loads older messages and prepends them", async () => {
    const initialBatch = Array.from({ length: 100 }, (_, index) =>
      message({
        id: `m-${index}`,
        createdAt: new Date(Date.UTC(2026, 3, 18, 10, index, 0)).toISOString(),
      })
    );

    mockedFetchMessages
      .mockResolvedValueOnce(initialBatch)
      .mockResolvedValueOnce([message({ id: "older-1", createdAt: "2026-04-18T09:59:00.000Z" })]);

    const { result } = renderHook(() => useChatMessages());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(mockedFetchMessages).toHaveBeenNthCalledWith(2, {
      limit: 100,
      before: initialBatch[0].createdAt,
    });
    expect(result.current.messages[0].id).toBe("older-1");
  });

  it("sends a message, updates author, and persists localStorage", async () => {
    mockedFetchMessages.mockResolvedValueOnce([]);
    mockedCreateMessage.mockResolvedValueOnce(
      message({
        id: "new-1",
        message: "sent",
        author: "Bob",
        createdAt: "2026-04-18T10:02:00.000Z",
      })
    );

    const { result } = renderHook(() => useChatMessages());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const previousScrollSignal = result.current.scrollToEndSignal;

    await act(async () => {
      await result.current.handleSendMessage("sent", "Bob");
    });

    expect(mockedCreateMessage).toHaveBeenCalledWith({ message: "sent", author: "Bob" });
    expect(result.current.activeAuthor).toBe("Bob");
    expect(window.localStorage.getItem("chat-author")).toBe("Bob");
    expect(result.current.messages.at(-1)?.id).toBe("new-1");
    expect(result.current.scrollToEndSignal).toBeGreaterThan(previousScrollSignal);
    expect(result.current.error).toBeNull();
  });

  it("sets an error when initial load fails", async () => {
    mockedFetchMessages.mockRejectedValue(new Error("Network broken"));

    const { result } = renderHook(() => useChatMessages());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await waitFor(() => expect(result.current.error).toBe("Network broken"));
    expect(result.current.messages).toEqual([]);
  });
});
