import type { InputSource, OnEvents } from "@/core/sources/InputSource"
import type { LogEvent } from "@/core/engine"
import { InputType } from '@/core/utils'

/**
 * Create a source from a raw string (useful for copy/paste).
 * Auto-detects JSON array vs NDJSON vs raw parseWinston.
 */
export function createClipboardSource(text: string): InputSource {
  return {
    type: InputType.clipboard,
    start: (onEvents: OnEvents) => {
      // try JSON array
      try {
        const maybe = JSON.parse(text)
        if (Array.isArray(maybe)) {
          return onEvents(maybe as LogEvent[])
        }
      } catch {
        // not a single JSON array, fallthrough
      }

      // try NDJSON
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      const ndjson: LogEvent[] = []
      let ndjsonWorks = true
      for (const l of lines) {
        try {
          ndjson.push(JSON.parse(l) as LogEvent)
        } catch {
          ndjsonWorks = false
          break
        }
      }
      if (ndjsonWorks && ndjson.length) {
        return onEvents(ndjson)
      }

      // fallback to parseWinston (if it can parse a whole text blob)
      try {
        const parsed = JSON.parse(text) as LogEvent[]
        return onEvents(parsed)
      } catch (err) {
        console.error("clipboard parse failed", err)
        onEvents([]) // or throw
      }
    }
  }
}