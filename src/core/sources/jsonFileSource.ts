import type { InputSource, OnEvents } from "@/core/sources/InputSource"
import { InputType } from '@/core/utils'

/**
 * Reads a file that's a single JSON array: [ {...}, {...} ]
 */
export function createFullJsonFileSource(json: any): InputSource {
  return {
    type: InputType.json,
    start: async (onEvents: OnEvents) => {
      onEvents(json)
    }
  }
}