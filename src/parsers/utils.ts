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