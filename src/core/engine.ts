import { discoverKeys } from "@/lib/utils"
import { toast } from "react-toastify"

export type Observer = {
  id: string;
  types: string[]; // for bookkeeping/metrics if you want
  renderAt: (tMs: number) => void; // compute from index and render
};

export class TimelineEngine {
  private observers: Observer[] = []

  constructor(private index: EventTypeIndex) {
  }

  register(observer: Observer) {
    const idx = this.observers.findIndex(o => o.id === observer.id)
    if (idx >= 0) {
      this.observers[idx] = observer
    } else {
      this.observers.push(observer)
    }
  }

  moveTo(tMs: number) {
    for (const o of this.observers) o.renderAt(tMs)
  }
}

// --- Core types --------------------------------------------------------------

export type LogEvent<TPayload = unknown> = Record<string, unknown>;

export type EventPoint<TPayload = unknown> = {
  timestampMs: number;
  data?: TPayload;
};

// --- EventBucket: one type's events (sorted; in-order appends) --------------

export class EventBucket<TPayload = unknown> {
  timestampsMs: Float64Array
  private data: (TPayload | undefined)[]
  private length: number           // logical size (<= capacity)

  private constructor(initialCapacity = 0) {
    this.timestampsMs = new Float64Array(initialCapacity)
    this.data = new Array<TPayload | undefined>(initialCapacity)
    this.length = 0
  }

  /** Create an empty bucket intended for in-order appends. */
  static empty<TPayload>(initialCapacity = 0): EventBucket<TPayload> {
    return new EventBucket<TPayload>(initialCapacity)
  }

  /** Create from a pre-sorted array of events (no extra sort). */
  static fromSortedEvents<TPayload>(events: EventPoint<TPayload>[]): EventBucket<TPayload> {
    const bucket = new EventBucket<TPayload>(events.length)
    for (let i = 0; i < events.length; i++) {
      bucket.timestampsMs[i] = events[i].timestampMs
      bucket.data[i] = events[i].data
    }
    bucket.length = events.length
    return bucket
  }

  /** Append a new event with timestamp >= last timestamp. O(1) amortized. */
  appendSorted(event: EventPoint<TPayload>): void {
    this.ensureCapacity(this.length + 1)
    // Optionally assert monotonicity in dev:
    // if (this.length && event.timestampMs < this.timestampsMs[this.length - 1]) throw new Error("Out-of-order append");
    this.timestampsMs[this.length] = event.timestampMs
    this.data[this.length] = event.data
    this.length++
  }

  /** Events count in (startTimeMs, endTimeMs]. */
  countInExclusiveInclusiveRange(startTimeMs: number, endTimeMs: number): number {
    if (this.length === 0 || endTimeMs <= startTimeMs) return 0
    const right = this.upperBound(endTimeMs)
    const left = this.upperBound(startTimeMs)
    return Math.max(0, right - left)
  }

  /** Lightweight view of events in (startTimeMs, endTimeMs] (timestamps are a subarray). */
  getEventsInExclusiveInclusiveRange(
    startTimeMs: number,
    endTimeMs: number
  ): { timestampsMs: Float64Array; payloads: (TPayload | undefined)[] } {
    if (this.length === 0 || endTimeMs <= startTimeMs) {
      return {timestampsMs: new Float64Array(0), payloads: []}
    }
    const right = this.upperBound(endTimeMs)
    const left = this.upperBound(startTimeMs)
    return {
      timestampsMs: this.timestampsMs.subarray(left, right),
      payloads: this.data.slice(left, right)
    }
  }

  /** Last event at or before time; undefined if none. */
  getLastEventAtOrBefore(timeMs: number): EventPoint<TPayload> | undefined {
    if (this.length === 0) return undefined
    const index = this.upperBound(timeMs) - 1
    if (index < 0) return undefined
    return {timestampMs: this.timestampsMs[index], data: this.data[index]}
  }

  /** Get first payload. */
  first(): TPayload | undefined {
    return this.data?.[0]
  }

  /** Logical size (number of events). */
  size(): number {
    return this.length
  }

  /** Optional: finalize to tightly sized arrays (e.g., before serialization). */
  seal(): void {
    if (this.length === this.timestampsMs.length) return
    this.timestampsMs = this.timestampsMs.slice(0, this.length)
    this.data.length = this.length
  }

  // --- internals -------------------------------------------------------------

  private ensureCapacity(required: number): void {
    if (required <= this.timestampsMs.length) return
    const newCapacity = Math.max(4, this.timestampsMs.length * 2, required)
    const grownTs = new Float64Array(newCapacity)
    grownTs.set(this.timestampsMs, 0)
    this.timestampsMs = grownTs

    const grownPayloads = new Array<TPayload | undefined>(newCapacity)
    for (let i = 0; i < this.length; i++) grownPayloads[i] = this.data[i]
    this.data = grownPayloads
  }

  /** First index with timestamp > target (binary search over used range). */
  private upperBound(target: number): number {
    let low = 0, high = this.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (this.timestampsMs[mid] <= target) low = mid + 1
      else high = mid
    }
    return low
  }
}

// --- EventTypeIndex: many types → buckets (sorted inputs) --------------------

export class EventTypeIndex<TPayload = unknown> {
  private bucketsByType = new Map<string, EventBucket<TPayload>>()

  static fromSortedBatch<TPayload extends Record<string, any>>(events: TPayload[]): EventTypeIndex<TPayload> {
    if (events.length === 0) {
      return new EventTypeIndex<TPayload>()
    }

    // Discover keys from the first event
    const {dateKey, messageKey} = discoverKeys(events[0])

    // Handle case where keys can't be found
    if (!dateKey || !messageKey) {
      toast.error("Could not determine date or message keys from the log file.")
      return new EventTypeIndex<TPayload>()
    }

    const index = new EventTypeIndex<TPayload>()
    for (const event of events) {
      let bucket = index.bucketsByType.get(event[messageKey]) // Now valid
      if (!bucket) {
        bucket = EventBucket.empty<TPayload>()
        index.bucketsByType.set(event[messageKey], bucket)
      }
      bucket.appendSorted({timestampMs: new Date(event[dateKey]).valueOf(), data: event}) // Now valid
    }
    return index
  }

  /** Append a live event (timestamp >= previous of the same type). */
  appendLiveSorted(event: TPayload, dateKey: string, messageKey: string): void {
    const message = (<Record<string, any>>event)[messageKey]
    const date = (<Record<string, any>>event)[dateKey]

    let bucket = this.bucketsByType.get(message)
    if (!bucket) {
      bucket = EventBucket.empty<TPayload>()
      this.bucketsByType.set(message, bucket)
    }
    bucket.appendSorted({timestampMs: new Date(date).valueOf(), data: event})
  }

  /** Retrieve a bucket; undefined if type not present. */
  getBucket(type: string): EventBucket<TPayload> | undefined {
    return this.bucketsByType.get(type)
  }

  /** Retrieve all buckets whose type key includes the given substring. */
  getBucketsIncludingType(substring: string): EventBucket<TPayload>[] {
    const results: EventBucket<TPayload>[] = []
    for (const [ key, bucket ] of this.bucketsByType.entries()) {
      if (key.toLowerCase().includes(substring.toLowerCase())) {
        results.push(bucket)
      }
    }
    return results
  }

  /** Ensure a bucket exists (useful for observer registration). */
  getOrCreateBucket(type: string): EventBucket<TPayload> {
    let bucket = this.bucketsByType.get(type)
    if (!bucket) {
      bucket = EventBucket.empty<TPayload>()
      this.bucketsByType.set(type, bucket)
    }
    return bucket
  }

  /** Introspection: list all indexed event types. */
  listTypes(): string[] {
    return Array.from(this.bucketsByType.keys())
  }

  /** Optional: seal all buckets to trim capacity before persisting. */
  sealAll(): void {
    for (const bucket of this.bucketsByType.values()) bucket.seal()
  }
}