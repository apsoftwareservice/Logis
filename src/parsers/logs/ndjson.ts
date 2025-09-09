import type { InputSource, OnEvents } from "@/parsers/logs/InputSource";
import type { LogEvent } from "@/parsers/engine";

/**
 * Stream/parse NDJSON file line-by-line to avoid huge allocations.
 * Returns an InputSource that emits all parsed events once finished.
 */
export function createNdjsonFileSource(file: File): InputSource {
  return {
    name: "file:ndjson",
    start: async (onEvents: OnEvents) => {
      const decoder = new TextDecoder();
      const reader = file.stream().getReader();
      let remainder = "";
      const events: LogEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        remainder += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = remainder.indexOf("\n")) >= 0) {
          const line = remainder.slice(0, idx).trim();
          remainder = remainder.slice(idx + 1);
          if (!line) continue;
          try {
            const obj = JSON.parse(line) as LogEvent;
            events.push(obj);
          } catch (err) {
            // optionally log or collect parse errors
            console.warn("ndjson parse error:", err, line);
          }
        }
      }
      if (remainder.trim().length) {
        try {
          events.push(JSON.parse(remainder.trim()) as LogEvent);
        } catch (err) {
          console.warn("ndjson trailing parse error:", err, remainder);
        }
      }

      onEvents(events);
    },
  };
}