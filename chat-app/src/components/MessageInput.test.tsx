import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageInput from '@/components/MessageInput'

describe('MessageInput', () => {
  const mockOnSendMessage = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders input and send button', () => {
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('focuses textarea on mount', async () => {
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox')
    await waitFor(() => {
      expect(input).toHaveFocus()
    })
  })

  it('disables send button when message is empty', () => {
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('enables send button when message has content', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'hello')

    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled()
  })

  it('sends message on button click', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'hello world')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(mockOnSendMessage).toHaveBeenCalledWith('hello world', 'alice')
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.type(input, 'test message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('returns focus to the textarea after sending', async () => {
    mockOnSendMessage.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'hello')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(input).toHaveFocus()
    })
  })

  it('sends message on Enter (without Shift)', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor="bob"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'hello{Enter}')

    expect(mockOnSendMessage).toHaveBeenCalledWith('hello', 'bob')
  })

  it('allows newline on Shift+Enter', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor="bob"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.type(input, 'line1{Shift>}{Enter}{/Shift}line2')

    expect(mockOnSendMessage).not.toHaveBeenCalled()
    expect(input.value).toContain('line1')
    expect(input.value).toContain('line2')
  })

  it('disables textarea while sending', () => {
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={true}
      />
    )

    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('shows error for empty message on Enter', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor="alice"
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '{Enter}')

    expect(screen.getByText('Please enter a message')).toBeInTheDocument()
    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })

  it('defaults to "You" if activeAuthor is empty', async () => {
    const user = userEvent.setup()
    render(
      <MessageInput
        activeAuthor=""
        onSendMessage={mockOnSendMessage}
        isSending={false}
      />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(mockOnSendMessage).toHaveBeenCalledWith('message', 'You')
  })
})
