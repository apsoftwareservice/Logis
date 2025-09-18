import type { InputSource, OnEvents } from "@/core/sources/InputSource"
import type { LogEvent } from "@/core/engine"

/**
 * Reads a file that's a single JSON array: [ {...}, {...} ]
 */
export function createFullJsonFileSource(file: File): InputSource {
  return {
    name: "file:full-json",
    start: async (onEvents: OnEvents) => {
      const json = await file.text()
      // parseWinston might accept string; if not, adapt this line.
      const parsed: LogEvent[] = JSON.parse(json) as LogEvent[]
      onEvents(parsed)
    }
  }
}