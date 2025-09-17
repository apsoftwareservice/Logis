import { DotPath } from '@/components/ui/nestedSelect';
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

// PathValue type to infer the return type of getNestedValue
type PathValue<T, P extends string> =
    P extends `${infer K}.${infer Rest}`
        ? K extends keyof T
            ? PathValue<T[K], Rest>
            : undefined
        : P extends `${infer K}[${number}]`
            ? K extends keyof T
                ? T[K] extends (infer U)[]
                    ? U
                    : undefined
                : undefined
            : P extends keyof T
                ? T[P]
                : undefined;

/**
 * Safely gets a nested property value from an object using a dot-notation or bracket-notation string.
 * This function is type-safe and provides autocompletion for the path string.
 * It is now capable of traversing arrays using bracket notation (e.g., "user.friends[0].name").
 * @param obj The object to search within.
 * @param path The dot-separated or bracket-separated string path (e.g., "user.address.street" or "data.items[0].name").
 * @returns The value at the specified path, or undefined if not found.
 */
export function getNestedValue<T extends object, P extends DotPath<T>>(obj: T, path: P): PathValue<T, P> | undefined {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  // Regex to split the path by dots and array brackets.
  // It handles paths like 'user.profile.items[0].name'
  const keys = path.split(/\.|\[(\d+)\]/).filter(Boolean);

  let current: any = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }

    if (Array.isArray(current) && !isNaN(Number(key))) {
      // If the current value is an array and the key is a number, access the array index.
      current = current[Number(key)];
    } else if (typeof current === 'object' && key in current) {
      // Otherwise, access the object property.
      current = current[key];
    } else {
      // If the key does not exist in the current object or array, return undefined.
      return undefined;
    }
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