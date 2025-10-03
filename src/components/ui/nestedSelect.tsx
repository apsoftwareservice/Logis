// Import the necessary components and hooks
import React, { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'

// Updated types from step 1
export type NestedObject = {
  [key: string]: string | number | boolean | NestedObject | NestedObject[] | string[] | number[] | boolean[];
};

export type DotPath<T> = T extends object
  ? {
    [K in keyof T & (string | number)]: T[K] extends object
      ? T[K] extends (infer U)[]
        ? U extends object
          ? `${ K }` | `${ K }[${ number }]` | `${ K }[${ number }].${ DotPath<U> }`
          : `${ K }` | `${ K }[${ number }]`
        : `${ K }` | `${ K }.${ DotPath<T[K]> }`
      : `${ K }`;
  }[keyof T & (string | number)]
  : any;

interface NestedSelectProps<T extends NestedObject> {
  data: T | T[] | string[] | number[] | boolean[];
  value?: string
  onSelect: (path: DotPath<T>) => void;
  prefix?: string;
}

function NestedSelect<T extends NestedObject>({data, value, onSelect, prefix = ''}: NestedSelectProps<T>) {
  const [ selectedValue, setSelectedValue ] = useState<string | null>(null)

  // Helpers to derive the pre-selected key from `value` (a full dot/bracket path) and current `prefix`
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  const derivedSelectedKey = useMemo(() => {
    if (!value || typeof value !== 'string') return null

    // Root or nested: figure out the next segment after `prefix`
    const pref = prefix || ''
    const isPrefRoot = pref.length === 0

    if (Array.isArray(data)) {
      // Expect something like `${prefix}[<index>]...` or `[<index>]...` at root
      const re = new RegExp(`^${isPrefRoot ? '' : escapeRegex(pref)}\\[(\\d+)\\]`)
      const m = value.match(re)
      if (m) return m[1] // index as string
      return null
    } else {
      // Objects: at root, take first token until '.' or '['; otherwise, expect `${prefix}.<token>`
      if (isPrefRoot) {
        const m = value.match(/^[^.\[]+/)
        return m ? m[0] : null
      } else {
        const re = new RegExp(`^${escapeRegex(pref)}\\.([^.\[]+)`)
        const m = value.match(re)
        return m ? m[1] : null
      }
    }
  }, [ value, prefix, /* eslint-disable-line react-hooks/exhaustive-deps */ ])

  // If the current data is an array, we'll render its items.
  const isArray = Array.isArray(data)
  const keys = isArray ? (data as any[]).map((_, index) => index.toString()) : Object.keys(data as T)

  const activeKey = selectedValue ?? derivedSelectedKey
  const nextData = activeKey != null
    ? (isArray ? (data as any[])[Number(activeKey)] : (data as T)[activeKey as keyof T])
    : undefined

  const nextIsObject = typeof nextData === 'object' && nextData !== null

  return (
    <Select
      value={ activeKey ?? undefined }
      onValueChange={ (value: string) => {
        setSelectedValue(value)
        const fullPath = isArray
          ? `${ prefix }[${ value }]`
          : prefix ? `${ prefix }.${ value }` : `${ value }`

        const selectedNext = isArray ? (data as any[])[Number(value)] : (data as T)[value as keyof T]

        // Check if the next level is an object or an array.
        if (typeof selectedNext !== 'object' || selectedNext === null) {
          onSelect(fullPath as DotPath<T>)
        }
      } }
    >
      <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900 min-w-40">
        <SelectValue placeholder="Choose value"/>
      </SelectTrigger>
      <SelectContent className={ 'bg-white cursor-pointer' }>
        { keys.map((key) => (
          <SelectItem key={ String(key) } value={ String(key) }>
            <div className="flex items-center justify-between cursor-pointer">
              <span>{ String(key) }</span>
              { (isArray
                ? typeof (data as any[])[Number(key)] === 'object' && (data as any[])[Number(key)] !== null
                : typeof (data as T)[key as keyof T] === 'object' && (data as T)[key as keyof T] !== null) && (
                <ChevronRight className="ml-2 h-4 w-4"/>
              ) }
            </div>
          </SelectItem>
        )) }
      </SelectContent>
      {/* Recursively render another NestedSelect */ }
      { activeKey != null && nextIsObject && (
        <NestedSelect
          // @ts-expect-error recursive narrowing
          data={ nextData as NestedObject }
          value={ value }
          onSelect={ onSelect }
          prefix={ isArray ? `${ prefix }[${ activeKey }]` : prefix ? `${ prefix }.${ String(activeKey) }` : String(activeKey) }
        />
      ) }
    </Select>
  )
}

export default NestedSelect