import { render, screen } from '@testing-library/react'
import { MessageBubble } from '@/components/MessageBubble'
import { Message } from '@/types/message'
import { __resetFormatCaches } from '@/lib/format'

describe('MessageBubble', () => {
  const message: Message = {
    id: '1',
    message: 'Hello world',
    author: 'alice',
    createdAt: '2026-04-18T10:30:45Z',
  }

  beforeEach(() => {
    __resetFormatCaches()
  })

  it('renders message content', () => {
    render(<MessageBubble message={message} isOwnMessage={false} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('shows author name for others messages', () => {
    render(<MessageBubble message={message} isOwnMessage={false} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('hides author name for own messages', () => {
    render(<MessageBubble message={message} isOwnMessage={true} />)
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
  })

  it('decodes HTML entities in author name', () => {
    const msgWithEntity = {
      ...message,
      author: 'Alice&#39;s Chat',
    }
    render(<MessageBubble message={msgWithEntity} isOwnMessage={false} />)
    expect(screen.getByText("Alice's Chat")).toBeInTheDocument()
  })

  it('decodes HTML entities in message', () => {
    const msgWithEntity = {
      ...message,
      id: '2',
      message: 'She said &quot;hello&quot; &amp; waved',
    }
    render(<MessageBubble message={msgWithEntity} isOwnMessage={false} />)
    expect(screen.getByText('She said "hello" & waved')).toBeInTheDocument()
  })

  it('applies own message styling', () => {
    const { container } = render(<MessageBubble message={message} isOwnMessage={true} />)
    const article = container.querySelector('article')
    expect(article).toHaveClass('bg-[#fff9c4]')
    expect(article).toHaveClass('border-[#e0d28a]')
  })

  it('applies other message styling', () => {
    const { container } = render(<MessageBubble message={message} isOwnMessage={false} />)
    const article = container.querySelector('article')
    expect(article).toHaveClass('bg-white')
    expect(article).toHaveClass('border-[#d8d8d8]')
  })

  it('aligns own messages to right', () => {
    const { container } = render(<MessageBubble message={message} isOwnMessage={true} />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('justify-end')
  })

  it('aligns other messages to left', () => {
    const { container } = render(<MessageBubble message={message} isOwnMessage={false} />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('justify-start')
  })
})
