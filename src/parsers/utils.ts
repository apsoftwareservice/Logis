// value = what onSeek returns
// startTime/endTime are epoch ms
import { LogEvent } from '@/parsers/engine'

export function seekValueToEpochMs(value: number, startTime: number, endTime: number) {
  const durationMs = endTime - startTime;

  // Heuristics for common slider outputs:
  if (value >= 0 && value <= 1) {
    // normalized [0..1]
    return startTime + value * durationMs;
  }
  if (value < 1e10) {
    // very likely seconds from start
    return startTime + value * 1000;
  }
  if (value < 1e12) {
    // very likely milliseconds from start
    return startTime + value;
  }
  // already an absolute epoch ms
  return value;
}

export function parseWinston(lines: {
  level: string
  message: string
  timestamp: string
  payload: any
}[]): LogEvent[] {
  // assume lines already sorted by time
  return lines.map(line => {
    return {
      timestampMs: new Date(line.timestamp).valueOf(),
      type: line.message,
      payload: line.payload
    }
  })
}