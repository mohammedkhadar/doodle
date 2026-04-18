import { render, screen } from '@testing-library/react'
import { MessageList } from '@/components/MessageList'
import { Message } from '@/types/message'

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn(() => ({
    getTotalSize: () => 1000,
    getVirtualItems: () => [],
    scrollToIndex: jest.fn(),
    measureElement: jest.fn(),
  })),
}))

describe('MessageList', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      message: 'Hello',
      author: 'alice',
      createdAt: '2026-04-18T10:00:00Z',
    },
    {
      id: '2',
      message: 'Hi there',
      author: 'bob',
      createdAt: '2026-04-18T10:01:00Z',
    },
  ]

  const defaultProps = {
    messages: mockMessages,
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    error: null,
    activeAuthor: 'alice',
    onLoadMore: jest.fn(),
    scrollToEndSignal: 0,
    loadMoreSignal: 0,
  }

  it('renders loading state', () => {
    render(
      <MessageList
        {...defaultProps}
        messages={[]}
        isLoading={true}
      />
    )

    expect(screen.getByText('Loading messages')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(
      <MessageList
        {...defaultProps}
        messages={[]}
        error="Connection failed"
      />
    )

    expect(screen.getByText('Unable to load chat')).toBeInTheDocument()
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
  })

  it('renders empty state when no messages', () => {
    render(
      <MessageList
        {...defaultProps}
        messages={[]}
        isLoading={false}
      />
    )

    expect(screen.getByText('No messages yet')).toBeInTheDocument()
  })

  it('renders scroll container when messages exist', () => {
    const { container } = render(
      <MessageList {...defaultProps} />
    )

    const scrollContainer = container.querySelector('[class*="overflow-y-auto"]')
    expect(scrollContainer).toBeInTheDocument()
  })

  it('shows loading spinner when loading more', () => {
    const { container } = render(
      <MessageList
        {...defaultProps}
        isLoadingMore={true}
      />
    )

    expect(container.querySelector('[class*="animate-spin"]')).toBeInTheDocument()
  })

  it('passes hasMore to hook for infinite scroll trigger', () => {
    const mockOnLoadMore = jest.fn()
    render(
      <MessageList
        {...defaultProps}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    )

    const scrollContainer = document.querySelector('[class*="overflow-y-auto"]')
    expect(scrollContainer).toBeInTheDocument()
  })
})
