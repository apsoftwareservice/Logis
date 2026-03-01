import { describe, it, expect, vi } from 'vitest'
import { detectFileFormat, InputType, isNewEvent } from './utils'
import { EventTypeIndex } from './engine'

// react-toastify is used by EventTypeIndex.fromSortedBatch
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }))

/** Creates a File-like object for tests; jsdom Blob.slice() may not have .text(). */
function createFileWithSlice(content: string): File {
  const blob = {
    text: () => Promise.resolve(content.slice(0, 1024)),
  }
  return {
    slice: () => blob,
  } as unknown as File
}

describe('detectFileFormat', () => {
  it('detects JSON array', async () => {
    const file = createFileWithSlice('[{"a":1}]')
    expect(await detectFileFormat(file)).toBe(InputType.json)
  })

  it('detects JSON object', async () => {
    const file = createFileWithSlice('{"a":1}')
    expect(await detectFileFormat(file)).toBe(InputType.json)
  })

  it('detects NDJSON when first line does not start with [ or {', async () => {
    const file = createFileWithSlice('id\n{"a":1}\n{"b":2}')
    expect(await detectFileFormat(file)).toBe(InputType.ndjson)
  })

  it('returns unknown for non-JSON', async () => {
    const file = createFileWithSlice('plain text')
    expect(await detectFileFormat(file)).toBe(InputType.unknown)
  })
})

describe('isNewEvent', () => {
  const dateKey = 'ts'
  const messageKey = 'msg'

  it('returns false when event timestamp exists in index', () => {
    const events = [
      { ts: '2024-01-01T00:00:00Z', msg: 'typeA' },
      { ts: '2024-01-01T00:00:01Z', msg: 'typeA' },
    ]
    const index = EventTypeIndex.fromSortedBatch(events)
    const event = { ts: '2024-01-01T00:00:00Z', msg: 'typeA' }
    expect(isNewEvent(event as any, dateKey, messageKey, index)).toBe(false)
  })

  it('returns true when event timestamp not in index', () => {
    const events = [
      { ts: '2024-01-01T00:00:00Z', msg: 'typeA' },
    ]
    const index = EventTypeIndex.fromSortedBatch(events)
    const event = { ts: '2024-01-01T00:00:02Z', msg: 'typeA' }
    expect(isNewEvent(event as any, dateKey, messageKey, index)).toBe(true)
  })

  it('returns true when index is null', () => {
    const event = { ts: '2024-01-01T00:00:00Z', msg: 'typeA' }
    expect(isNewEvent(event as any, dateKey, messageKey, null)).toBe(true)
  })

  it('returns false when message is null', () => {
    const events = [{ ts: '2024-01-01T00:00:00Z', msg: 'typeA' }]
    const index = EventTypeIndex.fromSortedBatch(events)
    const event = { ts: '2024-01-01T00:00:00Z', msg: null }
    expect(isNewEvent(event as any, dateKey, messageKey, index)).toBe(false)
  })

  it('returns false when timestamp is invalid', () => {
    const index = EventTypeIndex.fromSortedBatch([{ ts: '2024-01-01T00:00:00Z', msg: 'typeA' }])
    const event = { ts: 'not-a-date', msg: 'typeA' }
    expect(isNewEvent(event as any, dateKey, messageKey, index)).toBe(false)
  })
})
