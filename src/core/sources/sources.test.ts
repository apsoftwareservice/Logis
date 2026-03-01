import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputType } from '@/core/utils'
import { createFullJsonFileSource } from './jsonFileSource'
import { createNdjsonFileSource } from './ndJsonFileSource'
import { createEventSourceInput } from './eventSource'
import { createClipboardSource } from './clipboard'
import type { OnEvents } from './InputSource'

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('jsonFileSource', () => {
  it('returns source with type InputType.json', () => {
    const source = createFullJsonFileSource([])
    expect(source.type).toBe(InputType.json)
  })

  it('calls onEvents with the given json when start is invoked', async () => {
    const payload = [{ id: 1, msg: 'a' }, { id: 2, msg: 'b' }]
    const source = createFullJsonFileSource(payload)
    const onEvents = vi.fn<OnEvents>()
    await source.start(onEvents)
    expect(onEvents).toHaveBeenCalledTimes(1)
    expect(onEvents).toHaveBeenCalledWith(payload)
  })
})

describe('ndJsonFileSource', () => {
  it('returns source with type InputType.ndjson', () => {
    const file = new File([''], 'x.ndjson')
    const source = createNdjsonFileSource(file)
    expect(source.type).toBe(InputType.ndjson)
  })

  it('parses NDJSON lines and calls onEvents with array', async () => {
    const file = createFileWithStream('{"a":1}\n{"b":2}\n')
    const source = createNdjsonFileSource(file)
    const onEvents = vi.fn<OnEvents>()
    await source.start(onEvents)
    expect(onEvents).toHaveBeenCalledTimes(1)
    expect(onEvents).toHaveBeenCalledWith([{ a: 1 }, { b: 2 }])
  })

  it('handles chunked stream (remainder across reads)', async () => {
    const encoder = new TextEncoder()
    const chunks = [
      { done: false as const, value: encoder.encode('{"x":1}\n') },
      { done: false as const, value: encoder.encode('{"y":2}\n') },
      { done: true as const, value: undefined },
    ]
    let readIndex = 0
    const mockReader = {
      read: () => Promise.resolve(chunks[readIndex++]),
    }
    const mockFile = {
      stream: () => ({ getReader: () => mockReader }),
    } as unknown as File
    const source = createNdjsonFileSource(mockFile)
    const onEvents = vi.fn<OnEvents>()
    await source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([{ x: 1 }, { y: 2 }])
  })

  it('parses trailing line without newline', async () => {
    const encoder = new TextEncoder()
    const chunks = [
      { done: false as const, value: encoder.encode('{"a":1}\n{"b":2}') },
      { done: true as const, value: undefined },
    ]
    let readIndex = 0
    const mockFile = {
      stream: () => ({
        getReader: () => ({
          read: () => Promise.resolve(chunks[readIndex++]),
        }),
      }),
    } as unknown as File
    const source = createNdjsonFileSource(mockFile)
    const onEvents = vi.fn<OnEvents>()
    await source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([{ a: 1 }, { b: 2 }])
  })

  it('skips empty lines', async () => {
    const file = createFileWithStream('{"a":1}\n\n{"b":2}\n')
    const source = createNdjsonFileSource(file)
    const onEvents = vi.fn<OnEvents>()
    await source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([{ a: 1 }, { b: 2 }])
  })
})

function createFileWithStream(content: string): File {
  const encoder = new TextEncoder()
  const chunks = [{ done: false as const, value: encoder.encode(content) }, { done: true as const, value: undefined }]
  let readIndex = 0
  return {
    stream: () => ({ getReader: () => ({ read: () => Promise.resolve(chunks[readIndex++]) }) }),
  } as unknown as File
}

describe('eventSource', () => {
  const eventSourceInstances: Array<{
    url: string
    close: ReturnType<typeof vi.fn>
    triggerMessage: (ev: { data: string }) => void
  }> = []

  beforeEach(() => {
    eventSourceInstances.length = 0
    class MockEventSource {
      url: string
      close = vi.fn()
      private _onmessage: ((ev: MessageEvent) => void) | null = null

      constructor(url: string) {
        this.url = url
        const triggerMessage = (ev: { data: string }) => {
          if (this._onmessage) this._onmessage(ev as MessageEvent)
        }
        eventSourceInstances.push({ url, close: this.close, triggerMessage })
      }

      set onmessage(f: (ev: MessageEvent) => void) {
        this._onmessage = f
      }
      get onmessage() {
        return this._onmessage
      }
      set onerror(_f: (ev: Event) => void) {}
      get onerror() {
        return null
      }
    }
    vi.stubGlobal('EventSource', MockEventSource)
  })

  it('returns source with type InputType.stream', () => {
    const source = createEventSourceInput('http://example.com/stream')
    expect(source.type).toBe(InputType.stream)
  })

  it('creates EventSource with given url on start', () => {
    const source = createEventSourceInput('http://example.com/events')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    expect(eventSourceInstances).toHaveLength(1)
    expect(eventSourceInstances[0].url).toBe('http://example.com/events')
  })

  it('calls onEvents with array when message has payload.data array', () => {
    const source = createEventSourceInput('http://test')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    eventSourceInstances[0].triggerMessage({
      data: JSON.stringify({ type: 'event', data: [{ id: 1 }, { id: 2 }] }),
    })
    expect(onEvents).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }])
  })

  it('calls onEvents with single-element array when payload.data is object', () => {
    const source = createEventSourceInput('http://test')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    eventSourceInstances[0].triggerMessage({
      data: JSON.stringify({ type: 'e', data: { id: 1 } }),
    })
    expect(onEvents).toHaveBeenCalledWith([{ id: 1 }])
  })

  it('does not call onEvents when payload has no data', () => {
    const source = createEventSourceInput('http://test')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    eventSourceInstances[0].triggerMessage({ data: JSON.stringify({ type: 'connected' }) })
    expect(onEvents).not.toHaveBeenCalled()
  })

  it('stop closes EventSource', () => {
    const source = createEventSourceInput('http://test')
    source.start(vi.fn())
    expect(source.stop).toBeDefined()
    source.stop!()
    expect(eventSourceInstances[0].close).toHaveBeenCalled()
  })
})

describe('clipboard', () => {
  it('returns source with type InputType.clipboard', () => {
    const source = createClipboardSource('[]')
    expect(source.type).toBe(InputType.clipboard)
  })

  it('parses JSON array and calls onEvents', () => {
    const source = createClipboardSource('[{"a":1},{"b":2}]')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([{ a: 1 }, { b: 2 }])
  })

  it('parses NDJSON lines when text is not a single JSON array', () => {
    const source = createClipboardSource('{"a":1}\n{"b":2}')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([{ a: 1 }, { b: 2 }])
  })

  it('falls back to single JSON parse when NDJSON fails', () => {
    const source = createClipboardSource('{"single": true}')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([{ single: true }])
  })

  it('calls onEvents with empty array when all parsing fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const source = createClipboardSource('not json at all')
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([])
    consoleSpy.mockRestore()
  })

  it('treats valid JSON array before NDJSON', () => {
    const text = '[{"from":"array"}]'
    const source = createClipboardSource(text)
    const onEvents = vi.fn<OnEvents>()
    source.start(onEvents)
    expect(onEvents).toHaveBeenCalledWith([{ from: 'array' }])
  })
})
