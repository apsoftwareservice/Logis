import { describe, it, expect, vi } from 'vitest'
import { detectFileFormat, InputType, isNewEvent } from './utils'
import { EventTypeIndex } from './engine'

// react-toastify is used by EventTypeIndex.fromSortedBatch
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }))

describe('detectFileFormat', () => {
  it('detects JSON array', async () => {
    const file = new File(['[{"a":1}]'], 'x.json', { type: 'application/json' })
    expect(await detectFileFormat(file)).toBe(InputType.json)
  })

  it('detects JSON object', async () => {
    const file = new File(['{"a":1}'], 'x.json', { type: 'application/json' })
    expect(await detectFileFormat(file)).toBe(InputType.json)
  })

  it('detects NDJSON when first line does not start with [ or {', async () => {
    const file = new File(['id\n{"a":1}\n{"b":2}'], 'x.ndjson', { type: 'application/x-ndjson' })
    expect(await detectFileFormat(file)).toBe(InputType.ndjson)
  })

  it('returns unknown for non-JSON', async () => {
    const file = new File(['plain text'], 'x.txt', { type: 'text/plain' })
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
