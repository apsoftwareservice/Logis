"use client"

import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table"
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useImperativeHandle } from "react"
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  closestCenter,
  type DragEndEvent,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, Check, Cog, GripVertical, Plus, Search, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DashboardContainer } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { getNestedValue } from '@/lib/utils'
import { toast } from 'react-toastify'

const DEFAULT_AUTO_FIT_ENABLED = false
const MANUAL_MODE_SAMPLE_ROWS = 10
// Keep very short columns usable for headers, sort markers, and resize affordances.
const AUTO_FIT_MIN_WIDTH = 100
// Prevent a single row causing a column to be too wide
const AUTO_FIT_MAX_WIDTH = 1000
// Approximate average monospace character width in pixels for table content.
const AUTO_FIT_CHAR_WIDTH = 8
// Extra room for cell padding and table controls so content is not edge-to-edge.
const AUTO_FIT_CELL_PADDING = 48
// Reserve space for the per-column search trigger and drag handle so the header text does not collide with them.
const HEADER_CONTROL_SPACE = 52
const AUTO_FOLLOW_BOTTOM_THRESHOLD = 24

// Keep the width within the table's supported minimum and maximum bounds.
function boundAutoFitWidth(width: number) {
  return Math.min(
    AUTO_FIT_MAX_WIDTH,
    Math.max(AUTO_FIT_MIN_WIDTH, width)
  )
}

// Convert a cell value into the text form that the table will roughly display.
function stringifyCellValue(value: unknown, beautifyJSON = false): string {
  if (value == null) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object') {
    try {
      return beautifyJSON ? JSON.stringify(value, null, 2) : JSON.stringify(value)
    } catch {
      // Some objects cannot be JSON-stringified, such as circular structures.
      // Fall back to a plain string so auto-fit remains safe instead of crashing.
      return String(value)
    }
  }

  return String(value)
}

const stringIncludesFilter: FilterFn<any> = (row, columnId, filterValue) => {
  const rowValue = stringifyCellValue(row.getValue(columnId)).toLowerCase()
  const searchValue = String(filterValue ?? '').trim().toLowerCase()

  if (!searchValue) {
    return true
  }

  return rowValue.includes(searchValue)
}

// Find the longest visible line in a possibly multi-line string.
function getLongestLineLength(text: string) {
  return text
    .split('\n')
    .reduce((longest, line) => Math.max(longest, line.length), 0)
}

// Read the stable id used for sizing, persistence, and row lookups from a column definition.
// We use the same id for both the header label fallback and the row value lookup.
function getColumnId<TData extends Record<string, any>>(column: ColumnDef<TData, any>) {
  return (
    ((column as any).accessorKey as string) ||
    ((column as any).id as string)
  )
}

function getColumnValue<TData extends Record<string, any>>(column: ColumnDef<TData, any>, row: TData, rowIndex: number) {
  const accessorFn = (column as any).accessorFn
  if (typeof accessorFn === 'function') {
    return accessorFn(row, rowIndex)
  }

  const columnId = getColumnId(column)
  if (!columnId) return undefined
  return (row as any)?.[columnId]
}

// Estimate a column width from two sources:
// 1. the header text, because the header itself must fit
// 2. the longest value in the current dataset for that column
function estimateColumnWidth<TData extends Record<string, any>>(
  column: ColumnDef<TData, any>,
  rows: TData[],
  beautifyJSON = false
) {
  const columnId = getColumnId(column)
  if (!columnId) {
    return AUTO_FIT_MIN_WIDTH
  }

  const headerText = String((column as any).header || columnId)
  let longest = getLongestLineLength(headerText)

  for (let i = 0; i < rows.length; i++) {
    const value = getColumnValue(column, rows[i], i)
    longest = Math.max(longest, getLongestLineLength(stringifyCellValue(value, beautifyJSON)))
  }

  return boundAutoFitWidth(
    longest * AUTO_FIT_CHAR_WIDTH + AUTO_FIT_CELL_PADDING + HEADER_CONTROL_SPACE
  )
}

// Compute the width map that auto-fit mode should apply to every column right now.
function computeAutoFitColumnSizes<TData extends Record<string, any>>(
  columns: ColumnDef<TData, any>[],
  rows: TData[],
  beautifyJSON: boolean
) {
  return Object.fromEntries(
    columns
      .map((column: any) => {
        const columnId = getColumnId(column)
        if (!columnId) return null
        return [ columnId, estimateColumnWidth(column, rows, beautifyJSON) ]
      })
      .filter(Boolean) as Array<[string, number]>
  )
}

// Seed manual mode with a one-time best guess from the first few rows.
// This is intentionally lighter than auto-fit mode:
// it gives manual mode a sensible starting width, but it does not keep updating afterward.
function computeManualModeStartingSizes<TData extends Record<string, any>>(
  columns: ColumnDef<TData, any>[],
  rows: TData[],
  beautifyJSON: boolean
) {
  return computeAutoFitColumnSizes(
    columns,
    rows.slice(0, MANUAL_MODE_SAMPLE_ROWS),
    beautifyJSON
  )
}

// Avoid unnecessary state updates when the computed auto-fit widths already match the current ones.
function haveSameSizes(a: Record<string, number>, b: Record<string, number>) {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(([ key, width ]) => b[key] === width)
  )
}

type CustomColumnConfig = {
  id: string
  label: string
  path: string
}

function buildCustomColumnId(path: string) {
  return `custom:${path}`
}

const MAX_PATH_SUGGESTIONS = 20
const MAX_ROWS_SCANNED_FOR_SUGGESTIONS = 500

// Split a partially-typed path into the already-resolved parent path and the segment still
// being typed, so suggestions only ever need to look one level deep, not the whole tree.
function splitPathForSuggestions(path: string): { parentPath: string; prefix: string; isIndex: boolean } {
  const lastDot = path.lastIndexOf('.')
  const lastBracket = path.lastIndexOf('[')

  if (lastBracket > lastDot) {
    return { parentPath: path.slice(0, lastBracket), prefix: path.slice(lastBracket + 1), isIndex: true }
  }
  if (lastDot >= 0) {
    return { parentPath: path.slice(0, lastDot), prefix: path.slice(lastDot + 1), isIndex: false }
  }
  return { parentPath: '', prefix: path, isIndex: false }
}

// Collect the union of key names (or array indices) one level below parentPath, scanning only
// that one level across rows - cheap regardless of dataset size or how deeply nested paths get.
function getPathSuggestions<TData>(rows: TData[], parentPath: string, prefix: string): string[] {
  const keys = new Set<string>()

  for (let i = 0; i < rows.length && i < MAX_ROWS_SCANNED_FOR_SUGGESTIONS; i++) {
    const value = parentPath ? getNestedValue(rows[i] as any, parentPath as any) : rows[i]
    if (value == null || typeof value !== 'object') continue

    if (Array.isArray(value)) {
      value.forEach((_, index) => keys.add(String(index)))
    } else {
      Object.keys(value).forEach(key => keys.add(key))
    }
  }

  const lowerPrefix = prefix.toLowerCase()
  return Array.from(keys)
    .filter(key => key.toLowerCase().startsWith(lowerPrefix))
    .sort()
    .slice(0, MAX_PATH_SUGGESTIONS)
}

function CustomColumnBuilder<TData extends Record<string, any>>({
  rows,
  onAdd,
  onCancel,
}: {
  rows: TData[]
  onAdd: (column: { label: string; path: string }) => void
  onCancel?: () => void
}) {
  const [ label, setLabel ] = useState('')
  const [ path, setPath ] = useState('')
  const [ isPathFocused, setIsPathFocused ] = useState(false)
  const [ highlightedIndex, setHighlightedIndex ] = useState(-1)
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const reset = () => {
    setLabel('')
    setPath('')
  }

  const { parentPath, prefix, isIndex } = splitPathForSuggestions(path)
  const rawSuggestions = useMemo(
      () => (rows.length ? getPathSuggestions(rows, parentPath, prefix) : []),
      [rows, parentPath, prefix]
  )
  // A lone suggestion that exactly equals what's already typed isn't a real choice -
  // there's nothing left to complete, so don't offer it (and treat it as "nothing to pick").
  const suggestions = useMemo(() => {
    if (rawSuggestions.length === 1 && rawSuggestions[0].toLowerCase() === prefix.toLowerCase()) {
      return []
    }
    return rawSuggestions
  }, [rawSuggestions, prefix])

  // A fresh set of suggestions (new path segment) should never keep a stale highlight.
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [suggestions])

  // Keep the highlighted option visible when arrow-navigating past the scrollable window.
  useEffect(() => {
    suggestionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  const applySuggestion = (key: string) => {
    const nextPath = isIndex
      ? `${parentPath}[${key}]`
      : parentPath ? `${parentPath}.${key}` : key

    // If this key has children, advance straight to them instead of re-suggesting
    // the key itself (which would otherwise match its own name as a "prefix").
    const hasChildren = rows.length ? getPathSuggestions(rows, nextPath, '').length > 0 : false

    setPath(hasChildren ? `${nextPath}.` : nextPath)
    setLabel(nextPath)
  }

  const canSubmit = Boolean(path.trim()) && !/[.[]$/.test(path.trim())

  const submitColumn = () => {
    if (!canSubmit) return
    onAdd({
      label: label.trim() || path.trim(),
      path: path.trim(),
    })
    reset()
  }

  const handlePathKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (!suggestions.length) return
      event.preventDefault()
      setHighlightedIndex(i => (i + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      if (!suggestions.length) return
      event.preventDefault()
      setHighlightedIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        applySuggestion(suggestions[highlightedIndex])
      } else if (!suggestions.length) {
        // Nothing left to pick in the suggestions window - Enter finishes, same as clicking Add.
        submitColumn()
      }
    } else if (event.key === 'Escape') {
      setIsPathFocused(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Add custom column</div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Type a nested path (e.g. payload.order.customer.name), then name it.
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Column name</div>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. User Name"
          className="h-8 bg-white text-sm dark:bg-gray-950"
        />
      </div>

      <div className="relative mt-3 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Column value path</div>
        <Input
          value={path}
          onChange={(e) => { setPath(e.target.value); setIsPathFocused(true) }}
          onFocus={() => setIsPathFocused(true)}
          onBlur={() => setIsPathFocused(false)}
          onKeyDown={handlePathKeyDown}
          placeholder="payload.order.customer.name"
          className="h-8 bg-white font-mono text-sm dark:bg-gray-950"
        />
        {isPathFocused && suggestions.length > 0 ? (
          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            {suggestions.map((key, index) => (
              <button
                key={key}
                ref={(el) => { suggestionRefs.current[index] = el }}
                type="button"
                className={`flex w-full rounded px-2 py-1 text-left text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5 ${
                  index === highlightedIndex ? 'bg-gray-100 dark:bg-white/5' : ''
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => applySuggestion(key)}
              >
                {key}
              </button>
            ))}
          </div>
        ) : null}
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Load logs first so we can suggest paths.
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => { reset(); onCancel?.() }}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSubmit}
          onClick={submitColumn}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// localStorage helper (safe on SSR and JSON-guarded)
// ──────────────────────────────────────────────────────────────────────────────
const isBrowser = typeof window !== 'undefined'
const storage = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser) return fallback
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T) {
    if (!isBrowser) return
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch {}
  },
  del(key: string) {
    if (!isBrowser) return
    try { window.localStorage.removeItem(key) } catch {}
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Sortable header cell
// ──────────────────────────────────────────────────────────────────────────────
const SortableHeader = ({
  header,
  autoFitEnabled,
  activeFilterColumnId,
  setActiveFilterColumnId,
}: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: header.column.id })
  const filterRef = useRef<HTMLDivElement | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [isHintVisible, setIsHintVisible] = useState(false)
  const [isDragHintVisible, setIsDragHintVisible] = useState(false)
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties | null>(null)
  const isFilterOpen = activeFilterColumnId === header.column.id
  const filterValue = String(header.column.getFilterValue() ?? '').trim()
  const hasFilterValue = Boolean(filterValue)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  }

  const getCellStyle = (width: number) => ({
    width,
    minWidth: width,
    maxWidth: width,
    flexShrink: 0,
    flexGrow: 0,
  })


  useEffect(() => {
    if (!isFilterOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!filterRef.current?.contains(target) && !popupRef.current?.contains(target)) {
        setActiveFilterColumnId(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isFilterOpen, setActiveFilterColumnId])

  useLayoutEffect(() => {
    if (!isFilterOpen || !filterButtonRef.current || !isBrowser) {
      setPopupStyle(null)
      return
    }

    const updatePopupPosition = () => {
      const rect = filterButtonRef.current?.getBoundingClientRect()
      if (!rect) return

      const popupWidth = 220
      const spacing = 8
      const left = Math.min(
        Math.max(8, rect.left + (rect.width / 2) - (popupWidth / 2)),
        window.innerWidth - popupWidth - 8
      )

      setPopupStyle({
        position: 'fixed',
        left,
        top: Math.max(8, rect.top - spacing),
        width: popupWidth,
        transform: 'translateY(-100%)',
        zIndex: 80,
      })
    }

    updatePopupPosition()
    window.addEventListener('resize', updatePopupPosition)
    window.addEventListener('scroll', updatePopupPosition, true)
    return () => {
      window.removeEventListener('resize', updatePopupPosition)
      window.removeEventListener('scroll', updatePopupPosition, true)
    }
  }, [isFilterOpen])

  return (
      <>
      <div
          ref={node => {
            setNodeRef(node)
            filterRef.current = node
          }}
          style={{ ...style, ...getCellStyle(header.column.getSize()) }}
          className="text-black dark:text-white select-none p-3 relative group bg-white dark:bg-gray-900 overflow-visible"
      >
        <div className="flex items-center">
          {header.isPlaceholder ? null : (
              <div className="min-w-0 flex-1 pr-16">
                <button
                    type="button"
                    className="flex min-w-0 max-w-full cursor-pointer items-center gap-1 truncate text-left"
                    onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                  {header.column.getIsSorted() === "asc" && " ▲"}
                  {header.column.getIsSorted() === "desc" && " ▼"}
                </button>
              </div>
          )}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
            <div
                className="relative"
                onMouseEnter={() => setIsHintVisible(true)}
                onMouseLeave={() => setIsHintVisible(false)}
            >
              <button
                  ref={filterButtonRef}
                  type="button"
                  aria-label={`Search ${String(header.column.columnDef.header ?? header.column.id)}`}
                  onClick={() => setActiveFilterColumnId(isFilterOpen ? null : header.column.id)}
                  onFocus={() => setIsHintVisible(true)}
                  onBlur={() => setIsHintVisible(false)}
                  className={`rounded-md p-1 transition-colors ${
                    hasFilterValue
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/30'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                  }`}
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <div className={`pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-gray-950 px-3 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-75 dark:bg-gray-100 dark:text-gray-900 ${isHintVisible ? 'opacity-100' : 'opacity-0'}`}>
                {hasFilterValue ? `Filter: ${filterValue}` : 'Filter this column'}
              </div>
            </div>
            <span
                aria-label="Drag column"
                className="cursor-grab select-none bg-white px-1 dark:bg-gray-900"
                onMouseEnter={() => setIsDragHintVisible(true)}
                onMouseLeave={() => setIsDragHintVisible(false)}
                {...attributes}
                {...listeners}
            >
              ⋮⋮
            </span>
            <div className={`pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-gray-950 px-3 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-75 dark:bg-gray-100 dark:text-gray-900 ${isDragHintVisible ? 'opacity-100' : 'opacity-0'}`}>
              Drag to reorder columns
            </div>
          </div>
        </div>

        <div
            onMouseDown={autoFitEnabled ? undefined : header.getResizeHandler()}
            onTouchStart={autoFitEnabled ? undefined : header.getResizeHandler()}
            className={`absolute right-0 top-2 h-full w-3 select-none ${autoFitEnabled ? 'cursor-not-allowed opacity-40' : 'cursor-col-resize'}`}
        >
          <div
              className={
                  `mx-auto h-[70%] w-0.5 rounded-full transition-colors duration-150 ` +
                  (autoFitEnabled
                      ? "bg-gray-200 dark:bg-gray-700"
                      : header.column.getIsResizing()
                      ? "bg-gradient-to-b from-indigo-400 via-sky-500 to-cyan-400"
                      : "bg-gray-300 dark:bg-gray-600 group-hover:bg-gradient-to-b group-hover:from-indigo-300 group-hover:via-sky-400 group-hover:to-cyan-300 dark:group-hover:from-indigo-400 dark:group-hover:via-sky-500 dark:group-hover:to-cyan-400")
                  }
          />
        </div>
      </div>
      {isBrowser && isFilterOpen && popupStyle ? createPortal(
        <div
            ref={popupRef}
            style={popupStyle}
            className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
                value={(header.column.getFilterValue() ?? "") as string}
                onChange={e => header.column.setFilterValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setActiveFilterColumnId(null)
                  }
                }}
                autoFocus
                placeholder={`Search ${String(header.column.columnDef.header ?? header.column.id).toLowerCase()}...`}
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-gray-500 dark:focus:bg-gray-800"
            />
          </div>
        </div>,
        document.body
      ) : null}
      </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Virtualized Row (self-observing height) — works with @tanstack/react-virtual 3.13
// ──────────────────────────────────────────────────────────────────────────────

type RowProps = {
  row: any
  cellStyle: (w: number) => React.CSSProperties
  rowStyle: React.CSSProperties
  isEvenRow: boolean
  onSizeChange?: (el: HTMLDivElement) => void
} & React.HTMLAttributes<HTMLDivElement>

const VirtualizedTableRow = React.forwardRef<HTMLDivElement, RowProps>(({ row, cellStyle, rowStyle, isEvenRow, onSizeChange, ...props }, ref) => {
  const localRef = useRef<HTMLDivElement | null>(null)

  // expose the HTMLDivElement via forwardRef
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement)

  // Observe own size and notify virtualizer
  useLayoutEffect(() => {
    const el = localRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      onSizeChange?.(el)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onSizeChange])

  return (
      <div
          ref={node => { localRef.current = node }}
          className={`flex w-full text-sm font-mono whitespace-pre-wrap break-words ${isEvenRow ? "bg-gray-50 dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-900"}`}
          style={rowStyle}
          {...props}
      >
        {row.getVisibleCells().map((cell: any) => (
            <div
                key={cell.id}
                style={cellStyle(cell.column.getSize())}
                className="p-3 text-black dark:text-white"
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
        ))}
      </div>
  )
})
VirtualizedTableRow.displayName = "VirtualizedTableRow"

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
export default function GenericTable<TData extends Record<string, any>>({
                                                                          data,
                                                                          columns: columnsProp,
                                                                          container,
                                                                          followLogs,
                                                                          showDragHandle = true
                                                                        }: {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  container: DashboardContainer<any>
  followLogs: boolean
  // BaseView (TableView's wrapper) already renders its own drag handle - only
  // draw ours here for standalone usages (LoggerView) that skip BaseView.
  showDragHandle?: boolean
}) {
  const { removeContainer, setFollowLogs } = useDashboard()
  const [activeFilterColumnId, setActiveFilterColumnId] = useState<string | null>(null)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)

  // A stable key per table instance for persistence namespaces
  const tableKey = useMemo(() => `table:${container?.id ?? 'generic'}`, [container?.id])

  const [columns, setColumns] = useState<ColumnDef<TData, any>[]>([])
  const [sorting, setSorting] = useState<SortingState>(() => storage.get<SortingState>(`${tableKey}:sorting`, []))
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => storage.get<ColumnFiltersState>(`${tableKey}:filters`, []))
  const [beautifyJSON, setBeautifyJSON] = useState<boolean>(() => storage.get<boolean>(`${tableKey}:beautify`, false))
  const [columnOrder, setColumnOrder] = useState<string[]>(() => storage.get<string[]>(`${tableKey}:order`, []))
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
      () => storage.get<Record<string, number>>(`${tableKey}:sizes`, {})
  )
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(
      () => storage.get<string[]>(`${tableKey}:hiddenColumns`, [])
  )
  const [customColumns, setCustomColumns] = useState<CustomColumnConfig[]>(
      () => storage.get<CustomColumnConfig[]>(`${tableKey}:customColumns`, [])
  )
  const [autoFitEnabled, setAutoFitEnabled] = useState<boolean>(
      () => storage.get<boolean>(`${tableKey}:autoFit`, DEFAULT_AUTO_FIT_ENABLED)
  )

  const parentRef = useRef<HTMLDivElement>(null)
  const isAutoFollowingRef = useRef(followLogs)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(KeyboardSensor)
  )

  // Map incoming columns once, and reconcile order & sizes
  useEffect(() => {
    const mapped = columnsProp.map((col: any) => ({
      ...col,
      filterFn: col.filterFn ?? stringIncludesFilter,
      cell: col.cell ? col.cell : (info: any) => {
        const value = info.getValue() as unknown
        if (typeof value === 'number' && String(value).length === 13) {
          return new Date(value).toLocaleString()
        }
        if (typeof value === 'object') {
          const text = beautifyJSON ? JSON.stringify(value, null, 2) : JSON.stringify(value)
          return <pre className="m-0 whitespace-pre-wrap break-words">{text}</pre>
        }
        return <span className="whitespace-pre-wrap break-words">{String(value ?? '')}</span>
      }
    }))
    setColumns(mapped)
  }, [columnsProp, beautifyJSON, tableKey])

  const customColumnDefs = useMemo<ColumnDef<TData, any>[]>(() => {
    return customColumns.map((custom) => ({
      id: custom.id,
      header: custom.label || custom.path,
      accessorFn: (row: TData) => getNestedValue(row as any, custom.path as any),
      cell: (info: any) => {
        const value = info.getValue() as unknown
        if (typeof value === 'number' && String(value).length === 13) {
          return new Date(value).toLocaleString()
        }
        if (typeof value === 'object') {
          const text = beautifyJSON ? JSON.stringify(value, null, 2) : JSON.stringify(value)
          return <pre className="m-0 whitespace-pre-wrap break-words">{text}</pre>
        }
        return <span className="whitespace-pre-wrap break-words">{String(value ?? '')}</span>
      },
      meta: {
        isCustomColumn: true,
        sourcePath: custom.path,
      },
    }))
  }, [customColumns, beautifyJSON])

  const allColumns = useMemo(() => [...columns, ...customColumnDefs], [columns, customColumnDefs])
  const allColumnIds = useMemo(
      () => allColumns.map((column: any) => getColumnId(column)).filter(Boolean) as string[],
      [allColumns]
  )
  const columnLookup = useMemo(
      () => new Map(allColumns.map(column => [getColumnId(column) ?? '', column])),
      [allColumns]
  )
  const customColumnIdSet = useMemo(
      () => new Set(customColumns.map(column => column.id)),
      [customColumns]
  )
  const preserveMissingNativeColumns = columns.length === 0
  const hiddenColumnSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns])
  const visibleColumns = useMemo(
      () => allColumns.filter(column => !hiddenColumnSet.has(getColumnId(column) ?? '')),
      [allColumns, hiddenColumnSet]
  )
  const visibleColumnOrder = useMemo(
      () => columnOrder.filter(id => !hiddenColumnSet.has(id) && allColumnIds.includes(id)),
      [columnOrder, hiddenColumnSet, allColumnIds]
  )

  useEffect(() => {
    // Reconcile persisted column order/sizing/visibility against the current schema,
    // including custom columns created from the gear menu.
    const shouldKeepId = (id: string) => (
      allColumnIds.includes(id) ||
      (preserveMissingNativeColumns && !customColumnIdSet.has(id))
    )

    setColumnOrder(prev => {
      const prevOrStored = (prev?.length ? prev : storage.get<string[]>(`${tableKey}:order`, []))
      const kept = prevOrStored.filter(shouldKeepId)
      const appended = allColumnIds.filter(id => !kept.includes(id))
      const next = [...kept, ...appended]
      storage.set(`${tableKey}:order`, next)
      return next
    })

    setColumnSizing(prev => {
      const next: Record<string, number> = {}
      Object.entries(prev).forEach(([ id, size ]) => {
        if (shouldKeepId(id)) {
          next[id] = size
        }
      })
      storage.set(`${tableKey}:sizes`, next)
      return next
    })

    setHiddenColumns(prev => {
      const next = prev.filter(shouldKeepId)
      storage.set(`${tableKey}:hiddenColumns`, next)
      return next
    })
  }, [allColumnIds, customColumnIdSet, preserveMissingNativeColumns, tableKey])

  // Auto-fit mode: while enabled, widths always follow the longest value in the dataset (max width: AUTO_FIT_MAX_WIDTH)
  useEffect(() => {
    if (!autoFitEnabled || !columnsProp.length) {
      return
    }

    const nextAutoSizes = computeAutoFitColumnSizes(
      allColumns,
      data ?? [],
      beautifyJSON
    )

    setColumnSizing(prev => {
      if (haveSameSizes(prev, nextAutoSizes)) {
        return prev
      }
      storage.set(`${tableKey}:sizes`, nextAutoSizes)
      return nextAutoSizes
    })
  }, [autoFitEnabled, allColumns, beautifyJSON, data, tableKey])

  // Manual mode still gets a small one-time sizing pass from the first few rows
  // so it does not start with unusably narrow columns on a fresh table.
  useEffect(() => {
    if (autoFitEnabled || !allColumns.length) {
      return
    }

    const nextManualSizes = computeManualModeStartingSizes(
      allColumns,
      data ?? [],
      beautifyJSON
    )

    setColumnSizing(prev => {
      const merged = { ...nextManualSizes, ...prev }

      if (haveSameSizes(prev, merged)) {
        return prev
      }

      storage.set(`${tableKey}:sizes`, merged)
      return merged
    })
  }, [autoFitEnabled, allColumns, beautifyJSON, data, tableKey])

  const table = useReactTable({
    data: data ?? [],
    columns: visibleColumns,
    state: {
      sorting,
      columnFilters,
      columnOrder: visibleColumnOrder,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 15,
    // Keep stable key so DOM nodes match indices
    getItemKey: (index) => table.getRowModel().rows[index]?.id ?? index,
  })

  const getCellStyle = (width: number) => ({
    width,
    minWidth: width,
    maxWidth: width,
    flexShrink: 0,
    flexGrow: 0,
  })

  const scrollTableToBottom = () => {
    setFollowLogs(true)

    const scrollElement = parentRef.current
    if (!scrollElement) {
      return
    }

    scrollElement.scrollTop = scrollElement.scrollHeight
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = visibleColumnOrder.findIndex(id => id === active.id)
    const newIndex = visibleColumnOrder.findIndex(id => id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const nextVisibleOrder = arrayMove(visibleColumnOrder, oldIndex, newIndex)
    setColumnOrder(prev => {
      let visibleIndex = 0
      return prev.map(id => (
        hiddenColumnSet.has(id)
          ? id
          : nextVisibleOrder[visibleIndex++]
      ))
    })
  }

  const toggleColumnVisibility = (columnId: string) => {
    setHiddenColumns(prev => (
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    ))
  }

  const removeCustomColumn = (columnId: string) => {
    setCustomColumns(prev => prev.filter(column => column.id !== columnId))
  }

  const addCustomColumn = (column: { label: string; path: string }) => {
    const nextId = buildCustomColumnId(column.path)
    const trimmedLabel = column.label.trim()
    const trimmedPath = column.path.trim()

    if (!trimmedPath) {
      return
    }

    if (allColumnIds.includes(nextId) || customColumns.some(existing => existing.path === trimmedPath)) {
      toast.error('That custom column already exists')
      return
    }

    if (columns.some(existing => getColumnId(existing) === trimmedPath)) {
      toast.error('That path already exists as a column')
      return
    }

    setCustomColumns(prev => [
      ...prev,
      {
        id: nextId,
        label: trimmedLabel || trimmedPath,
        path: trimmedPath,
      },
    ])
    setIsAddColumnOpen(false)
  }

  // Persist on changes
  useEffect(() => { storage.set(`${tableKey}:sorting`, sorting) }, [tableKey, sorting])
  useEffect(() => { storage.set(`${tableKey}:filters`, columnFilters) }, [tableKey, columnFilters])
  useEffect(() => { storage.set(`${tableKey}:beautify`, beautifyJSON) }, [tableKey, beautifyJSON])
  useEffect(() => { storage.set(`${tableKey}:order`, columnOrder) }, [tableKey, columnOrder])
  useEffect(() => { storage.set(`${tableKey}:sizes`, columnSizing) }, [tableKey, columnSizing])
  useEffect(() => { storage.set(`${tableKey}:hiddenColumns`, hiddenColumns) }, [tableKey, hiddenColumns])
  useEffect(() => { storage.set(`${tableKey}:customColumns`, customColumns) }, [tableKey, customColumns])
  useEffect(() => { storage.set(`${tableKey}:autoFit`, autoFitEnabled) }, [autoFitEnabled, tableKey])

  useEffect(() => {
    isAutoFollowingRef.current = followLogs
  }, [followLogs])

  useEffect(() => {
    const scrollElement = parentRef.current
    if (!scrollElement) return

    const handleScroll = () => {
      const distanceFromBottom =
        scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
      const atBottom = distanceFromBottom <= AUTO_FOLLOW_BOTTOM_THRESHOLD

      setIsAtBottom(atBottom)

      const nextAutoFollowing = followLogs && atBottom
      isAutoFollowingRef.current = nextAutoFollowing
    }

    handleScroll()
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })

    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [followLogs])

  useLayoutEffect(() => {
    if (!followLogs || !isAutoFollowingRef.current || data.length === 0) return

    const scrollElement = parentRef.current
    if (!scrollElement) return

    scrollElement.scrollTop = scrollElement.scrollHeight
    setIsAtBottom(true)
  }, [data.length, followLogs])

  const visibleRows = table.getRowModel().rows
  const hasNoRows = data.length === 0
  const hasNoFilteredResults = data.length > 0 && visibleRows.length === 0
  const hasNoVisibleColumns = visibleColumns.length === 0

  return (
      <div className="h-full flex min-h-0">
        <div className="flex flex-col min-h-0 w-full">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showDragHandle && (
                <span
                    title="Drag to move"
                    className="drag-handle flex shrink-0 cursor-grab items-center text-gray-300 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:text-gray-400"
                >
                  <GripVertical width={18} height={18}/>
                </span>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Rows: {data?.length ?? 0}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Popover open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="dropdown-toggle">
                    <Plus width={18} height={18} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"/>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    className="w-80 border border-gray-200 bg-white p-3 text-gray-700 shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <CustomColumnBuilder
                      rows={data}
                      onAdd={addCustomColumn}
                      onCancel={() => setIsAddColumnOpen(false)}
                  />
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="dropdown-toggle">
                    <Cog width={18} height={18} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"/>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-56 border border-gray-200 bg-white p-2 text-gray-700 shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                >
                  <DropdownMenuItem
                      className="rounded-lg px-4 py-2 focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-white/5 dark:focus:text-gray-300"
                      onSelect={() => setBeautifyJSON(v => !v)}
                  >
                    <span className="flex-1">Beautify JSON</span>
                    {beautifyJSON ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                      className="rounded-lg px-4 py-2 focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-white/5 dark:focus:text-gray-300"
                      onSelect={() => setAutoFitEnabled(value => !value)}
                  >
                    <span className="flex-1 whitespace-nowrap">Auto-Fit Columns</span>
                    {autoFitEnabled ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : null}
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="rounded-lg px-4 py-2 focus:bg-gray-100 focus:text-gray-900 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900 dark:focus:bg-white/5 dark:focus:text-gray-300 dark:data-[state=open]:bg-white/5 dark:data-[state=open]:text-gray-300">
                      Columns
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-80 space-y-2 border border-gray-200 bg-white p-2 text-gray-700 shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                      <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        {allColumns.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                              No columns available yet.
                            </div>
                        ) : (
                            columnOrder
                              .filter(columnId => allColumnIds.includes(columnId))
                              .map((columnId) => {
                                const column = columnLookup.get(columnId)
                                if (!column) return null

                                const isVisible = !hiddenColumnSet.has(columnId)
                                const isCustom = customColumnIdSet.has(columnId)
                                const label = String((column as any).header || columnId)

                                return (
                                    <div
                                        key={columnId}
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/5"
                                    >
                                      <button
                                          type="button"
                                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                          onClick={() => toggleColumnVisibility(columnId)}
                                        >
                                        <span className="flex h-4 w-4 items-center justify-center text-green-600 dark:text-green-400">
                                          {isVisible ? <Check className="h-4 w-4" /> : null}
                                        </span>
                                        <span className="truncate">{label}</span>
                                      </button>
                                      {isCustom ? (
                                          <button
                                              type="button"
                                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500 dark:hover:bg-white/10"
                                              onClick={(event) => {
                                                event.stopPropagation()
                                                removeCustomColumn(columnId)
                                              }}
                                            >
                                            <X className="h-3.5 w-3.5" />
                                          </button>
                                      ) : null}
                                    </div>
                                )
                              })
                        )}
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                  <DropdownMenuItem
                      className="rounded-lg px-4 py-2 focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-white/5 dark:focus:text-gray-300"
                      onSelect={() => {
                        setColumnFilters([])
                        setBeautifyJSON(false)
                        setActiveFilterColumnId(null)
                        setSorting([])
                        setColumnSizing({})
                        setHiddenColumns([])
                        setCustomColumns([])
                        setAutoFitEnabled(DEFAULT_AUTO_FIT_ENABLED)
                        // clear persisted state
                        storage.set(`${tableKey}:filters`, [])
                        storage.set(`${tableKey}:beautify`, false)
                        storage.set(`${tableKey}:sorting`, [])
                        storage.set(`${tableKey}:sizes`, {})
                        storage.set(`${tableKey}:hiddenColumns`, [])
                        storage.set(`${tableKey}:customColumns`, [])
                        storage.set(`${tableKey}:autoFit`, DEFAULT_AUTO_FIT_ENABLED)
                      }}
                  >
                    Reset
                  </DropdownMenuItem>
                  <DropdownMenuItem
                      className="rounded-lg px-4 py-2 text-red-500 focus:bg-gray-100 focus:text-gray-700 dark:text-red-400 dark:focus:bg-white/5 dark:focus:text-gray-300"
                      onSelect={() => removeContainer(container)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="relative min-w-0 h-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
            <div ref={parentRef} className="flex-1 min-h-0 overflow-auto" style={{ scrollbarGutter: 'stable' }}>
              {hasNoRows || hasNoVisibleColumns ? (
                <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {hasNoRows ? 'No logs yet' : 'No visible columns'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {hasNoRows
                        ? 'Make sure you are in a live session or load a file to populate this table.'
                        : 'Open the gear menu and re-enable columns from the Columns list.'}
                    </div>
                  </div>
                </div>
              ) : (
              <div className="w-full">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="sticky top-0 z-10 dark:bg-gray-900 bg-gray-200 border-b border-gray-300 dark:border-gray-600 flex">
                    <SortableContext items={visibleColumnOrder} strategy={horizontalListSortingStrategy}>
                      {table.getHeaderGroups().map(headerGroup => (
                          headerGroup.headers.map((header) => (
                              <SortableHeader
                                key={header.id}
                                header={header}
                                autoFitEnabled={autoFitEnabled}
                                activeFilterColumnId={activeFilterColumnId}
                                setActiveFilterColumnId={setActiveFilterColumnId}
                              />
                          ))
                      ))}
                      <div className="flex-1"/>
                    </SortableContext>
                  </div>
                </DndContext>

                {hasNoFilteredResults ? (
                  <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        No logs matched the given filters
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Clear or adjust one of the active column searches to see results again
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }} className="w-full">
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const row = table.getRowModel().rows[virtualRow.index]
                      return (
                          <VirtualizedTableRow
                              key={virtualRow.key}
                              row={row}
                              data-index={virtualRow.index}
                              isEvenRow={row.index % 2 === 0}
                              onSizeChange={(el) => rowVirtualizer.measureElement(el)}
                              rowStyle={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              cellStyle={getCellStyle}
                          />
                      )
                    })}
                  </div>
                )}
              </div>
              )}
            </div>
            {!isAtBottom ? (
              <div className="group absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center">
                <div className="pointer-events-none mb-1 rounded-full bg-gray-950/90 px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg transition-opacity duration-75 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                  Jump to latest
                </div>
                <button
                  type="button"
                  onClick={scrollTableToBottom}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white/90 text-gray-600 shadow-lg shadow-black/10 backdrop-blur transition hover:bg-white hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                  aria-label="Scroll table to bottom"
                >
                  <ArrowDown width={18} height={18} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
  )
}
