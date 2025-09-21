import type { InputSource, OnEvents } from "@/core/sources/InputSource"
import { toast } from 'react-toastify'

/**
 * An EventSource-based stream that expects the server to send JSON events.
 * Each message is parsed and passed downstream as a single-element array.
 */
export function createEventSourceInput(url: string): InputSource {
  let es: EventSource | null = null
  return {
    name: `stream:eventsource:${ url }`,
    start: (onEvents: OnEvents) => {
      es = new EventSource(url)
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data) as { type: string, data: any }
          if (!payload?.data) {
            return
          }
          if (Array.isArray(payload.data)) onEvents(payload.data)
          else onEvents([ payload.data ])
        } catch (err) {
          toast.warn(`EventSource JSON parse error ${ err }`)
        }
      }
      es.onerror = (err) => {
        toast.error(`EventSource error ${ err }`)
        // Optionally call onEvents([]) or emit an error event through another channel
      }
    },
    stop: () => {
      es?.close()
      es = null
    }
  }
}