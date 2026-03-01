import { describe, it, expect } from 'vitest'
import {
  cn,
  capitalize,
  parseNumeric,
  discoverKeys,
  getNestedValue,
  toMs,
  seekValueToEpochMs,
} from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})

describe('capitalize', () => {
  it('capitalizes first character', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('')
  })

  it('returns original for single character', () => {
    expect(capitalize('a')).toBe('A')
  })
})

describe('parseNumeric', () => {
  it('parses number', () => {
    expect(parseNumeric(42)).toBe(42)
    expect(parseNumeric(-10)).toBe(-10)
  })

  it('parses numeric string', () => {
    expect(parseNumeric('123')).toBe(123)
    expect(parseNumeric('  99  ')).toBe(99)
  })

  it('parses decimal string', () => {
    expect(parseNumeric('12.34')).toBe(12.34)
  })

  it('strips currency and thousands', () => {
    expect(parseNumeric('$1,234.56')).toBe(1234.56)
  })

  it('handles parentheses as negative', () => {
    expect(parseNumeric('(123.45)')).toBe(-123.45)
  })

  it('returns null for non-numeric', () => {
    expect(parseNumeric(null)).toBe(null)
    expect(parseNumeric(undefined)).toBe(null)
  })

  it('returns 0 when string has no digits', () => {
    expect(parseNumeric('abc')).toBe(0)
  })

  it('returns null for NaN', () => {
    expect(parseNumeric(Number.NaN)).toBe(null)
  })
})

describe('discoverKeys', () => {
  it('finds timestamp and message keys', () => {
    const event = { timestamp: '2024-01-01T00:00:00Z', message: 'hello' }
    expect(discoverKeys(event)).toEqual({ dateKey: 'timestamp', messageKey: 'message' })
  })

  it('accepts date and msg', () => {
    const event = { date: '2024-01-01', msg: 'log' }
    expect(discoverKeys(event)).toEqual({ dateKey: 'date', messageKey: 'msg' })
  })

  it('falls back to longest string for message when no priority keys', () => {
    const event = { ts: 1704067200000, other: 'short', body: 'this is the longest string value' }
    expect(discoverKeys(event)).toEqual({ dateKey: 'ts', messageKey: 'body' })
  })
})

describe('getNestedValue', () => {
  it('gets top-level property', () => {
    expect(getNestedValue({ a: 1 }, 'a')).toBe(1)
  })

  it('gets nested property', () => {
    expect(getNestedValue({ a: { b: { c: 2 } } }, 'a.b.c')).toBe(2)
  })

  it('gets array element', () => {
    expect(getNestedValue({ items: [10, 20, 30] }, 'items.0')).toBe(10)
  })

  it('returns undefined for missing path', () => {
    expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined()
    expect(getNestedValue({ a: 1 }, 'a.b.c')).toBeUndefined()
  })

  it('returns undefined for null/non-object', () => {
    expect(getNestedValue(null as any, 'a')).toBeUndefined()
    expect(getNestedValue(42 as any, 'a')).toBeUndefined()
  })
})

describe('toMs', () => {
  it('returns null for null/undefined', () => {
    expect(toMs(null)).toBe(null)
    expect(toMs(undefined)).toBe(null)
  })

  it('keeps number as ms if large (epoch-like)', () => {
    expect(toMs(1704067200000)).toBe(1704067200000)
  })

  it('treats small number as seconds', () => {
    expect(toMs(1704067200)).toBe(1704067200000)
  })

  it('parses ISO string', () => {
    expect(toMs('2024-01-01T00:00:00.000Z')).toBe(1704067200000)
  })
})

describe('seekValueToEpochMs', () => {
  const start = 1000
  const end = 10000

  it('maps [0,1] to time range', () => {
    expect(seekValueToEpochMs(0, start, end)).toBe(1000)
    expect(seekValueToEpochMs(1, start, end)).toBe(10000)
    expect(seekValueToEpochMs(0.5, start, end)).toBe(5500)
  })

  it('treats small value as seconds from start', () => {
    expect(seekValueToEpochMs(2, start, end)).toBe(1000 + 2000)
  })

  it('treats value in [1e10, 1e12) as ms offset from start', () => {
    expect(seekValueToEpochMs(5e10, start, end)).toBe(1000 + 5e10)
  })

  it('returns value as-is when already epoch ms', () => {
    expect(seekValueToEpochMs(1704067200000, start, end)).toBe(1704067200000)
  })
})
