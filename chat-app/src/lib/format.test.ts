import { decodeEntities, formatTimestamp, __resetFormatCaches } from '@/lib/format'

describe('decodeEntities', () => {
  it('decodes single-quote entity', () => {
    expect(decodeEntities("it&#39;s")).toBe("it's")
  })

  it('decodes double-quote entity', () => {
    expect(decodeEntities('say &quot;hi&quot;')).toBe('say "hi"')
  })

  it('decodes ampersand entity', () => {
    expect(decodeEntities('a &amp; b')).toBe('a & b')
  })

  it('decodes less-than and greater-than entities', () => {
    expect(decodeEntities('&lt;tag&gt;')).toBe('<tag>')
  })

  it('decodes multiple entities in one string', () => {
    expect(decodeEntities('&quot;a&quot; &amp; &#39;b&#39;')).toBe('"a" & \'b\'')
  })

  it('leaves plain text untouched', () => {
    expect(decodeEntities('hello world')).toBe('hello world')
  })

  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&nbsp;')).toBe('&nbsp;')
  })
})

describe('formatTimestamp', () => {
  beforeEach(() => {
    __resetFormatCaches()
  })

  it('formats an ISO string as "DD MMM YYYY HH:mm"', () => {
    const out = formatTimestamp('2026-04-18T10:30:00Z')
    // Locale-formatted output: contains year, month abbreviation, and 24h time.
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/Apr/)
    expect(out).toMatch(/\d{2}:\d{2}$/)
  })

  it('returns the cached value for the same input', () => {
    const first = formatTimestamp('2026-04-18T10:30:00Z')
    const second = formatTimestamp('2026-04-18T10:30:00Z')
    expect(second).toBe(first)
  })

  it('formats distinct inputs independently', () => {
    const a = formatTimestamp('2026-04-18T10:30:00Z')
    const b = formatTimestamp('2026-05-18T10:30:00Z')
    expect(a).not.toBe(b)
  })
})
