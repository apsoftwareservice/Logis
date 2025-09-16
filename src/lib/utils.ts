import clsx, { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string') return null

  let s = value.trim()
  if (!s) return null

  // Support parentheses for negatives e.g. (123.45)
  const isParenNegative = /^\(.*\)$/.test(s)
  if (isParenNegative) {
    s = s.slice(1, -1)
  }

  // Remove currency symbols, spaces, and thousands separators
  s = s.replace(/[^0-9.-]+/g, "").trim()

  if (isParenNegative && s) {
    s = s.startsWith('-') ? s : `-${s}`
  }

  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

/** Build from a pre-sorted mixed stream (by time) without per-type sorting. */
// A simple function to discover the keys from a single event.
export function discoverKeys(event: any) {
  const dateKeyCandidates = ['timestamp', 'date', 'ts', 'createdAt'];
  const messageKeyCandidates = ['message', 'msg', 'logMessage', 'details', 'body'];

  let foundDateKey = null;
  let foundMessageKey = null;
  let longestStringValue = '';

  for (const key in event) {
    if (Object.prototype.hasOwnProperty.call(event, key)) {
      const value = event[key];

      // Try to find the date key
      if (!foundDateKey && dateKeyCandidates.includes(key) && !isNaN(new Date(value).valueOf())) {
        foundDateKey = key;
      }

      // Try to find the message key
      if (!foundMessageKey && messageKeyCandidates.includes(key) && typeof value === 'string') {
        foundMessageKey = key;
      }

      // Keep track of the longest string value as a fallback
      if (typeof value === 'string' && value.length > longestStringValue.length) {
        longestStringValue = value;
        // In this simple case, the key of the longest string is the fallback for messageKey
        // A more robust implementation might store the key separately
      }
    }
  }

  // Fallback if priority keys weren't found
  if (!foundDateKey) {
    // Re-iterate to find any valid date
    for (const key in event) {
      if (!isNaN(new Date(event[key]).valueOf())) {
        foundDateKey = key;
        break;
      }
    }
  }

  // Fallback for message key
  if (!foundMessageKey && longestStringValue.length > 0) {
    for(const key in event) {
      if(event[key] === longestStringValue) {
        foundMessageKey = key;
        break;
      }
    }
  }

  return { dateKey: foundDateKey, messageKey: foundMessageKey };
}

type DotPath<T> = T extends object
    ? {
      [K in keyof T & (string | number)]: T[K] extends object
          ? `${K}` | `${K}.${DotPath<T[K]>}`
          : `${K}`;
    }[keyof T & (string | number)]
    : any;

// This type also allows you to get the return type based on the path
type PathValue<T, P extends string> = P extends keyof T
    ? T[P]
    : P extends `${infer K}.${infer R}`
        ? K extends keyof T
            ? PathValue<T[K], R>
            : any
        : any;

/**
 * Safely gets a nested property value from an object using a dot-notation string.
 * This function is type-safe and provides autocompletion for the path string.
 * @param obj The object to search within.
 * @param path The dot-separated string path (e.g., "user.address.street").
 * @returns The value at the specified path, or undefined if not found.
 */
export function getNestedValue<T extends object, P extends DotPath<T>>(obj: object, path: string): PathValue<T, P> | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  const keys = path.split('.');

  let current: any = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object' || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return current as PathValue<T, P>;
}

// Helper to convert a value to a millisecond timestamp (accepts ms, sec, ISO string, Date)
export function toMs(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') {
    // If it's likely seconds, convert to ms; if already ms, keep as is
    const ms = v > 1e12 ? v : v * 1000
    return Number.isFinite(ms) ? ms : null
  }
  const parsed = Date.parse(String(v))
  return Number.isFinite(parsed) ? parsed : null
}

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