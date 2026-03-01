import { describe, it, expect, vi } from 'vitest'
import {
  TimelineEngine,
  EventBucket,
  EventTypeIndex,
  type Observer,
  type EventPoint,
} from './engine'
import type { InputSource } from '@/core/sources/InputSource'

vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }))

function createMockSource(): InputSource {
  return {
    type: 0,
    start: vi.fn(),
  }
}

describe('TimelineEngine', () => {
  it('registers an observer', () => {
    const source = createMockSource()
    const engine = new TimelineEngine(source)
    const observer: Observer = {
      id: 'obs1',
      types: ['a'],
      renderAt: vi.fn(),
    }
    engine.register(observer)
    expect(engine.isRegistered('obs1')).toBe(true)
  })

  it('replaces observer with same id', () => {
    const source = createMockSource()
    const engine = new TimelineEngine(source)
    const renderAt1 = vi.fn()
    engine.register({ id: 'obs1', types: [], renderAt: renderAt1 })
    engine.register({ id: 'obs1', types: ['b'], renderAt: vi.fn() })
    expect(engine.isRegistered('obs1')).toBe(true)
    engine.moveTo(1000)
    expect(renderAt1).not.toHaveBeenCalled()
  })

  it('moveTo calls renderAt on all observers', () => {
    const source = createMockSource()
    const engine = new TimelineEngine(source)
    const renderAt1 = vi.fn()
    const renderAt2 = vi.fn()
    engine.register({ id: 'a', types: [], renderAt: renderAt1 })
    engine.register({ id: 'b', types: [], renderAt: renderAt2 })
    engine.moveTo(5000)
    expect(renderAt1).toHaveBeenCalledWith(5000)
    expect(renderAt2).toHaveBeenCalledWith(5000)
  })

  it('isRegistered returns false for unknown id', () => {
    const source = createMockSource()
    const engine = new TimelineEngine(source)
    expect(engine.isRegistered('none')).toBe(false)
  })
})

describe('EventBucket', () => {
  describe('empty', () => {
    it('creates empty bucket', () => {
      const bucket = EventBucket.empty<{ id: number }>()
      expect(bucket.size()).toBe(0)
      expect(bucket.first()).toBeUndefined()
    })
  })

  describe('fromSortedEvents', () => {
    it('creates bucket from sorted events', () => {
      const events: EventPoint<{ id: number }>[] = [
        { timestampMs: 100, data: { id: 1 } },
        { timestampMs: 200, data: { id: 2 } },
      ]
      const bucket = EventBucket.fromSortedEvents(events)
      expect(bucket.size()).toBe(2)
      expect(bucket.first()).toEqual({ id: 1 })
    })

    it('handles empty array', () => {
      const bucket = EventBucket.fromSortedEvents([])
      expect(bucket.size()).toBe(0)
    })
  })

  describe('appendSorted', () => {
    it('appends in order', () => {
      const bucket = EventBucket.empty<number>()
      bucket.appendSorted({ timestampMs: 100, data: 1 })
      bucket.appendSorted({ timestampMs: 200, data: 2 })
      expect(bucket.size()).toBe(2)
    })
  })

  describe('countInExclusiveInclusiveRange', () => {
    it('returns 0 for empty bucket', () => {
      const bucket = EventBucket.empty()
      expect(bucket.countInExclusiveInclusiveRange(0, 1000)).toBe(0)
    })

    it('returns 0 when endTimeMs <= startTimeMs', () => {
      const bucket = EventBucket.fromSortedEvents([
        { timestampMs: 100 },
        { timestampMs: 200 },
      ])
      expect(bucket.countInExclusiveInclusiveRange(200, 100)).toBe(0)
    })

    it('counts events in (start, end]', () => {
      const bucket = EventBucket.fromSortedEvents([
        { timestampMs: 100 },
        { timestampMs: 200 },
        { timestampMs: 300 },
        { timestampMs: 400 },
      ])
      expect(bucket.countInExclusiveInclusiveRange(100, 300)).toBe(2)
      expect(bucket.countInExclusiveInclusiveRange(0, 500)).toBe(4)
      expect(bucket.countInExclusiveInclusiveRange(250, 350)).toBe(1)
    })
  })

  describe('getEventsInExclusiveInclusiveRange', () => {
    it('returns empty for empty bucket', () => {
      const bucket = EventBucket.empty()
      const result = bucket.getEventsInExclusiveInclusiveRange(0, 1000)
      expect(result.timestampsMs.length).toBe(0)
      expect(result.payloads).toEqual([])
    })

    it('returns events in (start, end]', () => {
      const bucket = EventBucket.fromSortedEvents([
        { timestampMs: 100, data: 'a' },
        { timestampMs: 200, data: 'b' },
        { timestampMs: 300, data: 'c' },
      ])
      const result = bucket.getEventsInExclusiveInclusiveRange(100, 300)
      expect(result.timestampsMs.length).toBe(2)
      expect(Array.from(result.timestampsMs)).toEqual([200, 300])
      expect(result.payloads).toEqual(['b', 'c'])
    })
  })

  describe('getLastEventAtOrBefore', () => {
    it('returns undefined for empty bucket', () => {
      const bucket = EventBucket.empty()
      expect(bucket.getLastEventAtOrBefore(1000)).toBeUndefined()
    })

    it('returns last event at or before time', () => {
      const bucket = EventBucket.fromSortedEvents([
        { timestampMs: 100, data: 'a' },
        { timestampMs: 200, data: 'b' },
        { timestampMs: 300, data: 'c' },
      ])
      expect(bucket.getLastEventAtOrBefore(0)).toBeUndefined()
      expect(bucket.getLastEventAtOrBefore(100)).toEqual({ timestampMs: 100, data: 'a' })
      expect(bucket.getLastEventAtOrBefore(150)).toEqual({ timestampMs: 100, data: 'a' })
      expect(bucket.getLastEventAtOrBefore(300)).toEqual({ timestampMs: 300, data: 'c' })
      expect(bucket.getLastEventAtOrBefore(999)).toEqual({ timestampMs: 300, data: 'c' })
    })
  })

  describe('seal', () => {
    it('trims capacity to length', () => {
      const bucket = EventBucket.empty<number>()
      bucket.appendSorted({ timestampMs: 1, data: 1 })
      bucket.appendSorted({ timestampMs: 2, data: 2 })
      bucket.seal()
      expect(bucket.size()).toBe(2)
      expect(bucket.timestampsMs.length).toBe(2)
    })
  })
})

describe('EventTypeIndex', () => {
  describe('fromSortedBatch', () => {
    it('returns empty index for empty array', () => {
      const index = EventTypeIndex.fromSortedBatch([])
      expect(index.listTypes()).toEqual([])
    })

    it('builds index from events with timestamp and message keys', () => {
      const events = [
        { timestamp: '2024-01-01T00:00:00Z', message: 'typeA' },
        { timestamp: '2024-01-01T00:00:01Z', message: 'typeA' },
        { timestamp: '2024-01-01T00:00:02Z', message: 'typeB' },
      ]
      const index = EventTypeIndex.fromSortedBatch(events)
      expect(index.listTypes()).toEqual(['typeA', 'typeB'])
      const bucketA = index.getBucket('typeA')
      expect(bucketA?.size()).toBe(2)
      const bucketB = index.getBucket('typeB')
      expect(bucketB?.size()).toBe(1)
    })

    it('returns empty index when date/message keys cannot be discovered', () => {
      const events = [{ x: 1, y: 2 }]
      const index = EventTypeIndex.fromSortedBatch(events)
      expect(index.listTypes()).toEqual([])
    })
  })

  describe('appendLiveSorted', () => {
    it('appends event to existing bucket', () => {
      const index = EventTypeIndex.fromSortedBatch([
        { timestamp: '2024-01-01T00:00:00Z', message: 'typeA' },
      ])
      index.appendLiveSorted(
        { timestamp: '2024-01-01T00:00:01Z', message: 'typeA' },
        'timestamp',
        'message'
      )
      expect(index.getBucket('typeA')?.size()).toBe(2)
    })

    it('creates new bucket for new type', () => {
      const index = new EventTypeIndex<Record<string, unknown>>()
      index.appendLiveSorted(
        { timestamp: '2024-01-01T00:00:00Z', message: 'newType' },
        'timestamp',
        'message'
      )
      expect(index.getBucket('newType')?.size()).toBe(1)
    })
  })

  describe('appendAndSort', () => {
    it('appends and sorts unsorted batch', () => {
      const index = new EventTypeIndex<Record<string, unknown>>()
      index.appendAndSort(
        [
          { timestamp: '2024-01-01T00:00:02Z', message: 'X' },
          { timestamp: '2024-01-01T00:00:00Z', message: 'X' },
          { timestamp: '2024-01-01T00:00:01Z', message: 'X' },
        ],
        'timestamp',
        'message'
      )
      const bucket = index.getBucket('X')
      expect(bucket?.size()).toBe(3)
      const range = bucket!.getEventsInExclusiveInclusiveRange(0, 1e15)
      expect(Array.from(range.timestampsMs)).toEqual([
        new Date('2024-01-01T00:00:00Z').valueOf(),
        new Date('2024-01-01T00:00:01Z').valueOf(),
        new Date('2024-01-01T00:00:02Z').valueOf(),
      ])
    })

    it('skips events with null message or date', () => {
      const index = new EventTypeIndex<Record<string, unknown>>()
      index.appendAndSort(
        [
          { timestamp: '2024-01-01T00:00:00Z', message: 'A' },
          { timestamp: null, message: 'A' },
          { timestamp: '2024-01-01T00:00:01Z', message: null },
        ] as any,
        'timestamp',
        'message'
      )
      expect(index.getBucket('A')?.size()).toBe(1)
    })

    it('no-ops for empty array', () => {
      const index = new EventTypeIndex<Record<string, unknown>>()
      index.appendAndSort([], 'timestamp', 'message')
      expect(index.listTypes()).toEqual([])
    })
  })

  describe('getBucket', () => {
    it('returns undefined for unknown type', () => {
      const index = EventTypeIndex.fromSortedBatch([
        { timestamp: '2024-01-01T00:00:00Z', message: 'A' },
      ])
      expect(index.getBucket('B')).toBeUndefined()
    })
  })

  describe('getBucketsIncludingType', () => {
    it('returns buckets whose type includes substring', () => {
      const index = EventTypeIndex.fromSortedBatch([
        { timestamp: '2024-01-01T00:00:00Z', message: 'error:auth' },
        { timestamp: '2024-01-01T00:00:01Z', message: 'error:network' },
        { timestamp: '2024-01-01T00:00:02Z', message: 'info' },
      ])
      const buckets = index.getBucketsIncludingType('error')
      expect(buckets.length).toBe(2)
    })

    it('is case-insensitive', () => {
      const index = EventTypeIndex.fromSortedBatch([
        { timestamp: '2024-01-01T00:00:00Z', message: 'ERROR' },
      ])
      const buckets = index.getBucketsIncludingType('error')
      expect(buckets.length).toBe(1)
    })
  })

  describe('getOrCreateBucket', () => {
    it('returns existing bucket', () => {
      const index = EventTypeIndex.fromSortedBatch([
        { timestamp: '2024-01-01T00:00:00Z', message: 'A' },
      ])
      const b1 = index.getOrCreateBucket('A')
      const b2 = index.getOrCreateBucket('A')
      expect(b1).toBe(b2)
    })

    it('creates and returns new bucket', () => {
      const index = new EventTypeIndex()
      const bucket = index.getOrCreateBucket('new')
      expect(bucket.size()).toBe(0)
      expect(index.getBucket('new')).toBe(bucket)
    })
  })

  describe('sealAll', () => {
    it('seals all buckets', () => {
      const index = EventTypeIndex.fromSortedBatch([
        { timestamp: '2024-01-01T00:00:00Z', message: 'A' },
        { timestamp: '2024-01-01T00:00:01Z', message: 'A' },
      ])
      index.sealAll()
      const bucket = index.getBucket('A')
      expect(bucket?.timestampsMs.length).toBe(2)
    })
  })
})
