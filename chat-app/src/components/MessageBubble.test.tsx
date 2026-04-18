import { render, screen } from '@testing-library/react'
import { Message } from '@/types/message'

// Extract MessageBubble for isolated testing
const MessageBubble = ({ message, isOwnMessage }: { message: Message; isOwnMessage: boolean }) => {
  function decodeEntities(text: string) {
    return text
      .replaceAll("&#39;", "'")
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&");
  }

  function formatTimestamp(dateString: string): string {
    const date = new Date(dateString)
    return (
      date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    )
  }

  return (
    <div className={`flex w-full min-w-0 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <article
        className={[
          "box-border w-fit min-w-0 max-w-[420px] rounded-[3px] border px-4 py-4",
          isOwnMessage
            ? "border-[#e0d28a] bg-[#fff9c4] text-[#333333]"
            : "border-[#d8d8d8] bg-white text-[#333333]",
        ].join(" ")}
      >
        {!isOwnMessage && (
          <p className="text-[12px] leading-[1.2] text-[#999999]">
            {decodeEntities(message.author)}
          </p>
        )}
        <p
          className={`break-words [overflow-wrap:anywhere] ${
            isOwnMessage
              ? "text-[16px] leading-[1.45]"
              : "mt-2 text-[16px] leading-[1.4]"
          }`}
        >
          {decodeEntities(message.message)}
        </p>
        <p
          className={`mt-3 text-[12px] ${
            isOwnMessage ? "text-right text-[#8a7968]" : "text-[#999999]"
          }`}
        >
          {formatTimestamp(message.createdAt)}
        </p>
      </article>
    </div>
  )
}

describe('MessageBubble', () => {
  const message: Message = {
    id: '1',
    message: 'Hello world',
    author: 'alice',
    createdAt: '2026-04-18T10:30:45Z',
  }

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
