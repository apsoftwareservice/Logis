import React, { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown/dropdown-menu'
import { cn } from '@/lib/utils'

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

function getPathLabel(prefix: string, key: string, isArray: boolean) {
  return isArray
    ? `${prefix}[${key}]`
    : prefix ? `${prefix}.${key}` : key
}

function NestedLevel<T extends NestedObject>({
  data,
  prefix = '',
  depth = 0,
  onSelect,
  currentValue,
}: {
  data: T | T[] | string[] | number[] | boolean[]
  prefix?: string
  depth?: number
  onSelect: (path: string) => void
  currentValue?: string
}) {
  const isArray = Array.isArray(data)
  const keys = isArray ? (data as any[]).map((_, index) => index.toString()) : Object.keys(data as T)

  const getValueAtKey = (key: string) => (
    isArray
      ? (data as any[])[Number(key)]
      : (data as T)[key as keyof T]
  )

  const isLeaf = (key: string) => {
    const value = getValueAtKey(key)
    return typeof value !== 'object' || value === null
  }

  return (
    <>
      {keys.map((key) => {
        const value = getValueAtKey(key)
        const fullPath = getPathLabel(prefix, key, isArray)
        const leaf = isLeaf(key)
        const isSelected = currentValue === fullPath
        const displayLabel = isArray ? fullPath : String(key)

        if (!leaf) {
          return (
            <DropdownMenuSub key={ fullPath }>
              <DropdownMenuSubTrigger
                className={ cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent",
                  depth > 0 && "pl-8"
                ) }
                onClick={ () => onSelect(fullPath) }
              >
                <span className="min-w-0 flex-1 truncate">{ displayLabel }</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className="max-h-96 overflow-y-auto border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                <NestedLevel
                  data={ value as any }
                  prefix={ fullPath }
                  depth={ depth + 1 }
                  onSelect={ onSelect }
                  currentValue={ currentValue }
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )
        }

        return (
          <DropdownMenuItem
            key={ fullPath }
            className={ cn(
              "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground",
              depth > 0 && "pl-8"
            ) }
            onSelect={ () => onSelect(fullPath) }
          >
            <span className="min-w-0 flex-1 truncate">{ displayLabel }</span>
            {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}

function NestedSelect<T extends NestedObject>({data, value, onSelect, prefix = ''}: NestedSelectProps<T>) {
  const [ open, setOpen ] = useState(false)
  const label = value || 'Choose value'
  const handleSelect = (path: string) => {
    onSelect(path as DotPath<T>)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-gray-600 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <span className="truncate">{label}</span>
          <ChevronRight className="h-4 w-4 rotate-90 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-96 min-w-44 overflow-hidden border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900" align="start">
        <NestedLevel
          data={ data }
          prefix={ prefix }
          onSelect={ handleSelect }
          currentValue={ value }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NestedSelect
