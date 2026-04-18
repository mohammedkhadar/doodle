import { fetchMessages, createMessage } from '@/lib/api'

global.fetch = jest.fn()

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchMessages', () => {
    it('fetches messages with limit param', async () => {
      const mockData = [
        { id: '1', message: 'hello', author: 'alice', createdAt: '2026-04-18T10:00:00Z' },
      ]
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchMessages({ limit: 50 })
      expect(result).toHaveLength(1)
      expect(result[0].message).toBe('hello')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      )
    })

    it('fetches newer messages with after param', async () => {
      const timestamp = '2026-04-18T10:00:00Z'
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await fetchMessages({ after: timestamp })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`after=${encodeURIComponent(timestamp)}`),
        expect.any(Object)
      )
    })

    it('unwraps nested messages response', async () => {
      const mockData = {
        messages: [
          { id: '1', message: 'test', author: 'bob', createdAt: '2026-04-18T10:00:00Z' },
        ],
      }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchMessages()
      expect(result).toHaveLength(1)
      expect(result[0].author).toBe('bob')
    })

    it('throws on fetch failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      })

      await expect(fetchMessages()).rejects.toThrow('Failed to fetch messages')
    })
  })

  describe('createMessage', () => {
    it('creates a message with payload', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-1',
          message: 'hello world',
          author: 'charlie',
          createdAt: '2026-04-18T10:05:00Z',
        }),
      })

      const result = await createMessage({ message: 'hello world', author: 'charlie' })
      expect(result.id).toBe('new-1')
      expect(result.author).toBe('charlie')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/messages'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'hello world', author: 'charlie' }),
        })
      )
    })

    it('normalizes message id from _id field', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'mongo-id-123',
          message: 'test',
          author: 'dave',
          createdAt: '2026-04-18T10:10:00Z',
        }),
      })

      const result = await createMessage({ message: 'test', author: 'dave' })
      expect(result.id).toBe('mongo-id-123')
    })
  })
})
