import type { InputSource, OnEvents } from "@/core/sources/InputSource"
import { InputType } from '@/core/utils'

/**
 * Reads a file that's a single JSON array: [ {...}, {...} ]
 */
export function createFullJsonFileSource(file: File): InputSource {
  return {
    type: InputType.json,
    start: async (onEvents: OnEvents) => {
      const json = await file.text()
      // parseWinston might accept string; if not, adapt this line.
      const parsed= JSON.parse(json)
      onEvents(parsed)
    }
  }
}