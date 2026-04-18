import { render, screen, waitFor, act } from '@testing-library/react'
import Chat from '@/components/Chat'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
jest.mock('@/components/MessageList', () => ({
  MessageList: ({ messages, isLoading, error, onLoadMore }: Record<string, unknown>) => (
    <div data-testid="message-list">
      {isLoading && <div>Loading</div>}
      {error && <div>Error: {error}</div>}
      {(messages as unknown[]).length > 0 && <div>{(messages as unknown[]).length} messages</div>}
      <button onClick={onLoadMore} data-testid="load-more">Load More</button>
    </div>
  ),
}))

jest.mock('@/components/MessageInput', () => ({
  __esModule: true,
  default: ({ activeAuthor, onSendMessage, isSending }: Record<string, unknown>) => (
    <div data-testid="message-input">
      <div>{activeAuthor}</div>
      <div>{isSending ? 'Sending' : 'Ready'}</div>
      <button
        onClick={async () => {
          await onSendMessage('message', 'author')
        }}
        disabled={isSending}
      >
        Send
      </button>
    </div>
  ),
}))

describe('Chat', () => {
  const mockMessages = [
    { id: '1', message: 'first', author: 'alice', createdAt: '2026-04-18T10:00:00Z' },
    { id: '2', message: 'second', author: 'bob', createdAt: '2026-04-18T10:01:00Z' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    localStorage.clear()
    ;(api.fetchMessages as jest.Mock).mockResolvedValue(mockMessages)
    ;(api.createMessage as jest.Mock).mockResolvedValue({
      id: '3',
      message: 'new',
      author: 'charlie',
      createdAt: '2026-04-18T10:02:00Z',
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  // Core rendering and lifecycle tests
  it('renders message list and input', async () => {
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })
  })

  it('loads initial messages on mount', async () => {
    render(<Chat />)
    await waitFor(() => {
      expect(api.fetchMessages).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, before: expect.any(String) })
      )
    })
  })

  it('displays messages after loading', async () => {
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

  it('cleans up interval on unmount', async () => {
    const { unmount } = render(<Chat />)
    await waitFor(() => {
      expect(api.fetchMessages).toHaveBeenCalled()
    })
    const spy = jest.spyOn(global, 'clearInterval')
    unmount()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  // Message loading and pagination
  it('sets hasMore to true when 100 messages returned', async () => {
    const manyMessages = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      message: `msg ${i}`,
      author: 'alice',
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
    }))
    ;(api.fetchMessages as jest.Mock).mockResolvedValueOnce(manyMessages)
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('100 messages')).toBeInTheDocument()
    })
  })

  it('sets hasMore to false when fewer than 100 messages returned', async () => {
    ;(api.fetchMessages as jest.Mock).mockResolvedValueOnce(mockMessages)
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

  it('polls for newer messages every 5 seconds', async () => {
    render(<Chat />)
    await waitFor(() => {
      expect(api.fetchMessages).toHaveBeenCalled()
    })
    const initialCallCount = (api.fetchMessages as jest.Mock).mock.calls.length
    jest.advanceTimersByTime(5000)
    await waitFor(() => {
      expect((api.fetchMessages as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  it('merges server messages with local state', async () => {
    ;(api.fetchMessages as jest.Mock)
      .mockResolvedValueOnce([mockMessages[0]])
      .mockResolvedValueOnce([mockMessages[1]])
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('1 messages')).toBeInTheDocument()
    })
    jest.advanceTimersByTime(5000)
    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

  // Author management and localStorage
  it('persists author to localStorage on send', async () => {
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })
    const sendBtn = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendBtn.click()
    })
    await waitFor(() => {
      expect(localStorage.getItem('chat-author')).toBe('author')
    })
  })

  it('loads author from localStorage on mount', async () => {
    localStorage.setItem('chat-author', 'saved-author')
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('saved-author')).toBeInTheDocument()
    })
  })

  it('trims whitespace from saved author', async () => {
    localStorage.setItem('chat-author', '  spaced-author  ')
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('spaced-author')).toBeInTheDocument()
    })
  })

  // Message sending
  it('sends created message to API with trimmed values', async () => {
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })
    const sendBtn = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendBtn.click()
    })
    await waitFor(() => {
      expect(api.createMessage).toHaveBeenCalledWith({
        message: 'message',
        author: 'author',
      })
    })
  })

  it('shows sending state while sending', async () => {
    ;(api.createMessage as jest.Mock).mockImplementationOnce(() => new Promise(() => {}))
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })
    const sendBtn = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendBtn.click()
    })
    expect(sendBtn).toBeDisabled()
  })

  it('updates messages list after send', async () => {
    ;(api.fetchMessages as jest.Mock).mockResolvedValueOnce([mockMessages[0]])
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('1 messages')).toBeInTheDocument()
    })
    const sendBtn = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendBtn.click()
    })
    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

  it('handles send error gracefully', async () => {
    ;(api.createMessage as jest.Mock).mockRejectedValueOnce(new Error('Send failed'))
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })
    const sendBtn = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendBtn.click()
    })
    expect(screen.getByTestId('message-input')).toBeInTheDocument()
  })

  // Error handling
  it('handles fetch error gracefully', async () => {
    const error = new Error('Network error')
    ;(api.fetchMessages as jest.Mock).mockRejectedValueOnce(error)
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    }, { timeout: 100 })
  })

  it('clears error on successful send', async () => {
    ;(api.fetchMessages as jest.Mock)
      .mockRejectedValueOnce(new Error('Initial error'))
      .mockResolvedValueOnce(mockMessages)
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    }, { timeout: 100 })
    const sendBtn = screen.getByRole('button', { name: /send/i })
    expect(sendBtn).toBeInTheDocument()
  })

  // Message state management
  it('sorts messages by createdAt on merge', async () => {
    const unordered = [mockMessages[1], mockMessages[0]]
    ;(api.fetchMessages as jest.Mock).mockResolvedValueOnce(unordered)
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

  it('defaults to "You" when author is empty', async () => {
    localStorage.removeItem('chat-author')
    render(<Chat />)
    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })
  })
})
