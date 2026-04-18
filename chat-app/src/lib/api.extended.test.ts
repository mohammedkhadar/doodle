import { fetchMessages, createMessage } from '@/lib/api'

global.fetch = jest.fn()

describe('api - extended cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchMessages - response unwrapping', () => {
    it('unwraps messages array directly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' },
        ],
      })

      const result = await fetchMessages()
      expect(result).toHaveLength(1)
    })

    it('unwraps nested data array', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: '1', message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' },
          ],
        }),
      })

      const result = await fetchMessages()
      expect(result).toHaveLength(1)
    })

    it('handles empty response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const result = await fetchMessages()
      expect(result).toHaveLength(0)
    })

    it('handles null/undefined payload', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })

      const result = await fetchMessages()
      expect(result).toHaveLength(0)
    })
  })

  describe('fetchMessages - id normalization', () => {
    it('uses _id when present', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { _id: 'mongo-123', message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' },
        ],
      })

      const result = await fetchMessages()
      expect(result[0].id).toBe('mongo-123')
    })

    it('falls back to id when _id missing', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'uuid-456', message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' },
        ],
      })

      const result = await fetchMessages()
      expect(result[0].id).toBe('uuid-456')
    })

    it('generates fallback id when both missing', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' },
        ],
      })

      const result = await fetchMessages()
      expect(result[0].id).toMatch(/^local-/)
    })

    it('ignores empty string id and uses fallback', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '', message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' },
        ],
      })

      const result = await fetchMessages()
      expect(result[0].id).toMatch(/^local-/)
    })
  })

  describe('fetchMessages - field defaults', () => {
    it('defaults empty message to empty string', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', author: 'a', createdAt: '2026-04-18T10:00:00Z' }],
      })

      const result = await fetchMessages()
      expect(result[0].message).toBe('')
    })

    it('defaults empty author to empty string', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', message: 'msg', createdAt: '2026-04-18T10:00:00Z' }],
      })

      const result = await fetchMessages()
      expect(result[0].author).toBe('')
    })

    it('defaults empty createdAt to empty string', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', message: 'msg', author: 'a' }],
      })

      const result = await fetchMessages()
      expect(result[0].createdAt).toBe('')
    })
  })

  describe('fetchMessages - url parameters', () => {
    it('encodes special characters in after param', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const timestamp = '2026-04-18T10:00:00+05:30'
      await fetchMessages({ after: timestamp })

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0]
      expect(callUrl).toContain(encodeURIComponent(timestamp))
    })

    it('encodes special characters in before param', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const timestamp = '2026-04-18T10:00:00Z'
      await fetchMessages({ before: timestamp })

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0]
      expect(callUrl).toContain(encodeURIComponent(timestamp))
    })
  })

  describe('createMessage - response handling', () => {
    it('handles minimal response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const result = await createMessage({ message: 'test', author: 'a' })
      expect(result.message).toBe('')
      expect(result.author).toBe('')
      expect(result.id).toMatch(/^local-/)
    })

    it('calls local messages endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' }),
      })

      await createMessage({ message: 'test', author: 'a' })

      const url = (global.fetch as jest.Mock).mock.calls[0][0]
      expect(url).toBe('/api/messages')
    })

    it('sends correct content-type header', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', message: 'msg', author: 'a', createdAt: '2026-04-18T10:00:00Z' }),
      })

      await createMessage({ message: 'test', author: 'a' })

      const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('fetchMessages - error messages', () => {
    it('includes status in error message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      })

      await expect(fetchMessages()).rejects.toThrow('Forbidden')
    })

    it('handles network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'))

      await expect(fetchMessages()).rejects.toThrow()
    })
  })
})
