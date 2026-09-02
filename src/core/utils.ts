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

// Checks whether `text` is a single, self-contained JSON value (all brackets/braces
// closed, not left open, not inside an unterminated string). Used to tell a NDJSON
// line (a complete object per line) apart from a pretty-printed multi-line JSON document
// (whose first line opens an object/array that doesn't close until much later).
function isBalancedJsonValue(text: string): boolean {
  if (!text) return false

  let depth = 0
  let inString = false
  let escapeNext = false

  for (const char of text) {
    if (escapeNext) {
      escapeNext = false
      continue
    }
    if (inString) {
      if (char === "\\") escapeNext = true
      else if (char === "\"") inString = false
      continue
    }
    if (char === "\"") inString = true
    else if (char === "{" || char === "[") depth++
    else if (char === "}" || char === "]") depth--
  }

  return depth === 0 && !inString
}

export async function detectFileFormat(file: File): Promise<InputType> {
  // A .ndjson/.jsonl extension is an unambiguous signal - trust it and skip content-sniffing.
  const name = file.name.toLowerCase()
  if (name.endsWith(".ndjson") || name.endsWith(".jsonl")) return InputType.ndjson

  // Only read a small chunk - large enough to fit one full line even for wide rows.
  const sample = await file.slice(0, 16384).text()
  const trimmedStart = sample.trimStart()

  if (trimmedStart.startsWith("[")) return InputType.json

  if (trimmedStart.startsWith("{")) {
    const firstNewline = trimmedStart.indexOf("\n")
    if (firstNewline >= 0 && isBalancedJsonValue(trimmedStart.slice(0, firstNewline).trim())) {
      // The first line is already a complete JSON object on its own - NDJSON, not a
      // single pretty-printed document (which would still have an open brace here).
      return InputType.ndjson
    }
    return InputType.json
  }

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