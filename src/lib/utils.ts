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