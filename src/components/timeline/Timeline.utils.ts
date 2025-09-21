import { TimeUnit } from '@/components/timeline/TimeLine.types'

export function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b)
}

export function formatDate(ts: number) {
  if (!isFinite(ts)) return "-"
  const d = new Date(ts)
  // Compact, locale-aware date+time
  return d.toLocaleString()
}

export function formatBoundaryLabel(ts: number, otherTs: number) {
  const date = new Date(ts);
  const otherDate = new Date(otherTs);

  // Always show time in 24-hour format
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  };

  // If year differs, include year + month + day
  if (date.getFullYear() !== otherDate.getFullYear()) {
    opts.year = "numeric";
    opts.month = "short";
    opts.day = "2-digit";
  }
  // Else if month differs, include month + day
  else if (date.getMonth() !== otherDate.getMonth()) {
    opts.month = "short";
    opts.day = "2-digit";
  }
  // Else if day differs, include day
  else if (date.getDate() !== otherDate.getDate()) {
    opts.day = "2-digit";
  }

  // Use date+time if any date fields were added, else time-only
  return (opts.year || opts.month || opts.day)
    ? date.toLocaleString(undefined, opts)
    : date.toLocaleTimeString(undefined, opts);
}

/*** Dynamic unit selection + calendar math ***/

export function chooseUnit(windowLenSec: number): TimeUnit {
  // Heuristics: pick the coarsest unit that still shows ~8–20 ticks nicely
  if (windowLenSec >= 2 * 365 * 24 * 3600) return "year"        // >= ~2 years
  if (windowLenSec >= 60 * 24 * 3600) return "month"            // >= ~2 months
  if (windowLenSec >= 2 * 24 * 3600) return "day"               // >= ~2 days
  if (windowLenSec >= 2 * 3600) return "hour"                   // >= ~2 hours
  if (windowLenSec >= 2 * 60) return "minute"                   // >= ~2 minutes
  return "second"
}

export function floorToUnitBoundary(ts: number, unit: TimeUnit): number {
  const d = new Date(ts)
  switch (unit) {
    case "year":
      d.setMonth(0, 1)
      d.setHours(0, 0, 0, 0)
      break
    case "month":
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      break
    case "day":
      d.setHours(0, 0, 0, 0)
      break
    case "hour":
      d.setMinutes(0, 0, 0)
      break
    case "minute":
      d.setSeconds(0, 0)
      break
    case "second":
      d.setMilliseconds(0)
      break
  }
  return d.getTime()
}

export function addUnit(ts: number, unit: TimeUnit, amount: number): number {
  const d = new Date(ts)
  switch (unit) {
    case "year":
      d.setFullYear(d.getFullYear() + amount)
      break
    case "month":
      d.setMonth(d.getMonth() + amount)
      break
    case "day":
      d.setDate(d.getDate() + amount)
      break
    case "hour":
      d.setHours(d.getHours() + amount)
      break
    case "minute":
      d.setMinutes(d.getMinutes() + amount)
      break
    case "second":
      d.setSeconds(d.getSeconds() + amount)
      break
  }
  return d.getTime()
}

export function formatTickLabel(ts: number, unit: TimeUnit) {
  const d = new Date(ts)
  switch (unit) {
    case "year":
      return d.getFullYear().toString()
    case "month":
      return d.toLocaleString(undefined, {month: "short", year: "numeric"})
    case "day":
      return d.toLocaleDateString(undefined, {month: "short", day: "numeric"})
    case "hour":
      return d.toLocaleString(undefined, {hour: "2-digit", minute: "2-digit", hour12: false})
    case "minute":
      return d.toLocaleTimeString(undefined, {hour: "2-digit", minute: "2-digit", hour12: false})
    case "second":
      return d.toLocaleTimeString(undefined, {hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false})
  }
}

export function snapTsToUnit(ts: number, unit: TimeUnit): number {
  const floor = floorToUnitBoundary(ts, unit)
  const next = addUnit(floor, unit, 1)
  // Snap to nearest boundary
  return ts - floor < (next - floor) / 2 ? floor : next
}