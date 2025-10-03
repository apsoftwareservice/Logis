import { EventTypeIndex, LogEvent } from '@/core/engine'

/**
 * Samples the first bytes of a File to guess whether it's a JSON array or NDJSON.
 * Returns 'full-json' | 'ndjson' | 'unknown'
 */
export const enum InputType {
  json,
  ndjson,
  stream,
  clipboard,
  unknown
}

export async function detectFileFormat(file: File): Promise<InputType> {
  // only read the first small chunk
  const sample = await file.slice(0, 1024).text()
  const trimmedStart = sample.trimStart()
  if (trimmedStart.startsWith("[") || trimmedStart.startsWith("{")) return InputType.json
  if (trimmedStart.includes("\n")) return InputType.ndjson

  return InputType.unknown
}

export function isNewEvent(event: LogEvent, dateKey: string, messageKey: string, index: EventTypeIndex<any> | null): boolean {
  const message = (event as any)[messageKey]
  const timestamp = new Date((event as any)[dateKey]).valueOf()
  if (!Number.isFinite(timestamp) || message == null) return false

  const bucket = index?.getBucket(String(message))
  if (!bucket) return true

  const arr = bucket.timestampsMs
  // Binary search for exact timestamp match
  let lowIndex = 0, highIndex = arr.length - 1
  while (lowIndex <= highIndex) {
    const midIndex = (lowIndex + highIndex) >> 1
    const currentTimestamp = arr[midIndex]
    if (currentTimestamp === timestamp) return false
    if (currentTimestamp < timestamp) {
      lowIndex = midIndex + 1
    } else {
      highIndex = midIndex - 1
    }
  }
  return true
}