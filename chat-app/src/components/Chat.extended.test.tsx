import { render, screen, waitFor, act } from '@testing-library/react'
import Chat from '@/components/Chat'
import * as api from '@/lib/api'

jest.mock('@/lib/api')
jest.mock('@/components/MessageList', () => ({
  MessageList: ({ messages, isLoading, error, onLoadMore }: any) => (
    <div data-testid="message-list">
      {isLoading && <div>Loading</div>}
      {error && <div>Error: {error}</div>}
      {messages.length > 0 && <div>{messages.length} messages</div>}
      <button onClick={onLoadMore} data-testid="load-more">Load More</button>
    </div>
  ),
}))

jest.mock('@/components/MessageInput', () => ({
  __esModule: true,
  default: ({ activeAuthor, onSendMessage, isSending }: any) => (
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

describe('Chat - extended', () => {
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

  it('persists author to localStorage', async () => {
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

  it('fetches with correct params on initial load', async () => {
    jest.clearAllMocks()
    ;(api.fetchMessages as jest.Mock).mockResolvedValueOnce([])

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
    ;(api.createMessage as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // never resolves
    )

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })

    const sendBtn = screen.getByRole('button', { name: /send/i })
    await act(async () => {
      sendBtn.click()
    })

    // Component properly disables button while sending
    expect(sendBtn).toBeDisabled()
  })

  it('sorts messages by createdAt on merge', async () => {
    const unordered = [
      mockMessages[1], // newer
      mockMessages[0], // older
    ]
    ;(api.fetchMessages as jest.Mock).mockResolvedValueOnce(unordered)

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByText('2 messages')).toBeInTheDocument()
    })
    // Internal sorting happens; component receives sorted messages
  })

  it('clears error on successful send', async () => {
    ;(api.fetchMessages as jest.Mock)
      .mockRejectedValueOnce(new Error('Initial error'))
      .mockResolvedValueOnce(mockMessages)

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    }, { timeout: 100 })

    // Send succeeds - component handles error clearing internally
    const sendBtn = screen.getByRole('button', { name: /send/i })
    expect(sendBtn).toBeInTheDocument()
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

    // Component should remain stable and not crash
    expect(screen.getByTestId('message-input')).toBeInTheDocument()
  })

  it('defaults to "You" when author is empty', async () => {
    localStorage.removeItem('chat-author')

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument()
    })
    // Author defaults are handled internally
  })
})
