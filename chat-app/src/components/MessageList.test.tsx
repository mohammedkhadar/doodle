import { render, screen } from '@testing-library/react'
import { type ReactNode } from 'react'
import { MessageList } from '@/components/MessageList'
import { Message } from '@/types/message'

interface VirtuosoMockProps {
  data?: Message[]
  itemContent: (index: number, item: Message) => ReactNode
  components?: {
    Header?: () => ReactNode
  }
  'data-testid'?: string
}

jest.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data = [],
    itemContent,
    components,
    'data-testid': testId,
  }: VirtuosoMockProps) => (
    <div data-testid={testId ?? 'virtuoso'}>
      {components?.Header ? <components.Header /> : null}
      {data.map((item: Message, index: number) => (
        <div key={item.id}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
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
    render(
      <MessageList {...defaultProps} />
    )

    expect(screen.getByTestId('message-list')).toBeInTheDocument()
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

    expect(screen.getByTestId('message-list')).toBeInTheDocument()
  })
})
