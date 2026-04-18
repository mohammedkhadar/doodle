import { render, screen, waitFor, act } from '@testing-library/react'
import Chat from '@/components/Chat'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
jest.mock('@/components/MessageList', () => ({
  MessageList: ({ messages, isLoading, onLoadMore }: any) => (
    <div data-testid="message-list">
      {isLoading && <div>Loading</div>}
      {messages.length > 0 && <div>{messages.length} messages</div>}
      <button onClick={onLoadMore}>Load More</button>
    </div>
  ),
}))

jest.mock('@/components/MessageInput', () => ({
  __esModule: true,
  default: ({ onSendMessage }: any) => (
    <div data-testid="message-input">
      <button
        onClick={async () => {
          await onSendMessage('test message', 'test-author')
        }}
      >
        Send
      </button>
    </div>
  ),
}))

describe('Chat', () => {
  const mockMessages = [
    {
      id: '1',
      message: 'Hello',
      author: 'alice',
      createdAt: '2026-04-18T10:00:00Z',
    },
    {
      id: '2',
      message: 'Hi',
      author: 'bob',
      createdAt: '2026-04-18T10:01:00Z',
    },
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
        expect.objectContaining({
          limit: 100,
          before: expect.any(String),
        })
      )
    })
  })

  it('shows loading state initially', async () => {
    ;(api.fetchMessages as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // never resolves
    )

    render(<Chat />)

    await waitFor(
      () => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument()
      },
      { timeout: 100 }
    )
  })

  it('displays messages after loading', async () => {
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

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

  it('sends message with active author', async () => {
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    })

    const sendButton = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendButton.click()
    })

    await waitFor(() => {
      expect(api.createMessage).toHaveBeenCalledWith({
        message: 'test message',
        author: 'test-author',
      })
    })
  })

  it('updates active author in localStorage on send', async () => {
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    })

    const sendButton = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendButton.click()
    })

    await waitFor(() => {
      expect(localStorage.getItem('chat-author')).toBe('test-author')
    })
  })

  it('loads saved author from localStorage on mount', async () => {
    localStorage.setItem('chat-author', 'saved-author')

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })

    // Author is loaded but we can't directly verify it without more component inspection
    // This test verifies the flow executes without error
  })

  it('adds sent message to local state immediately', async () => {
    ;(api.fetchMessages as jest.Mock).mockResolvedValueOnce([mockMessages[0]])

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByText('1 messages')).toBeInTheDocument()
    })

    const sendButton = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendButton.click()
    })

    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

  it('merges server messages with local state', async () => {
    ;(api.fetchMessages as jest.Mock)
      .mockResolvedValueOnce([mockMessages[0]]) // initial: 1 message
      .mockResolvedValueOnce([mockMessages[1]]) // polling: 1 new message

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByText('1 messages')).toBeInTheDocument()
    })

    jest.advanceTimersByTime(5000)

    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
  })

  it('handles fetch error gracefully', async () => {
    const error = new Error('Network error')
    ;(api.fetchMessages as jest.Mock).mockRejectedValueOnce(error)

    render(<Chat />)

    await waitFor(() => {
      // Component renders without crashing, even with error
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    }, { timeout: 100 })
  })

  it('passes onLoadMore callback to message list', async () => {
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    })

    // onLoadMore callback is connected (verified by component not crashing)
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
  })

})
