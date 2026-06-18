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
import { Check, Cog, Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DashboardContainer } from '@/types/containers'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'
import { useDashboard } from '@/context/DashboardContext'

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
    const value = rows[i]?.[columnId]
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
                                                                          followLogs
                                                                        }: {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  container: DashboardContainer<any>
  followLogs: boolean
}) {
  const { removeContainer } = useDashboard()
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)
  const [activeFilterColumnId, setActiveFilterColumnId] = useState<string | null>(null)

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
  const [autoFitEnabled, setAutoFitEnabled] = useState<boolean>(
      () => storage.get<boolean>(`${tableKey}:autoFit`, DEFAULT_AUTO_FIT_ENABLED)
  )

  const parentRef = useRef<HTMLDivElement>(null)
  const isAutoFollowingRef = useRef(followLogs)

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

    const ids = mapped
        .map((c: any) => (c.accessorKey as string) ?? (c.id as string))
        .filter(Boolean)

    // reconcile column order (keep known, append new)
    setColumnOrder(prev => {
      const prevOrStored = (prev?.length ? prev : storage.get<string[]>(`${tableKey}:order`, []))
      const kept = prevOrStored.filter(id => ids.includes(id))
      const appended = ids.filter(id => !kept.includes(id))
      const next = [...kept, ...appended]
      storage.set(`${tableKey}:order`, next)
      return next
    })

    // prune sizing for removed columns
    setColumnSizing(prev => {
      const next: Record<string, number> = {}
      ids.forEach(id => { if (prev[id] != null) next[id] = prev[id] })
      storage.set(`${tableKey}:sizes`, next)
      return next
    })
  }, [columnsProp, beautifyJSON, tableKey])

  // Auto-fit mode: while enabled, widths always follow the longest value in the dataset (max width: AUTO_FIT_MAX_WIDTH)
  useEffect(() => {
    if (!autoFitEnabled || !columnsProp.length) {
      return
    }

    const nextAutoSizes = computeAutoFitColumnSizes(
      columnsProp,
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
  }, [autoFitEnabled, beautifyJSON, columnsProp, data, tableKey])

  // Manual mode still gets a small one-time sizing pass from the first few rows
  // so it does not start with unusably narrow columns on a fresh table.
  useEffect(() => {
    if (autoFitEnabled || !columnsProp.length) {
      return
    }

    const nextManualSizes = computeManualModeStartingSizes(
      columnsProp,
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
  }, [autoFitEnabled, beautifyJSON, columnsProp, data, tableKey])

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnOrder,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = columnOrder.findIndex(id => id === active.id)
    const newIndex = columnOrder.findIndex(id => id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(columnOrder, oldIndex, newIndex)
    setColumnOrder(newOrder)
  }

  // Persist on changes
  useEffect(() => { storage.set(`${tableKey}:sorting`, sorting) }, [tableKey, sorting])
  useEffect(() => { storage.set(`${tableKey}:filters`, columnFilters) }, [tableKey, columnFilters])
  useEffect(() => { storage.set(`${tableKey}:beautify`, beautifyJSON) }, [tableKey, beautifyJSON])
  useEffect(() => { storage.set(`${tableKey}:order`, columnOrder) }, [tableKey, columnOrder])
  useEffect(() => { storage.set(`${tableKey}:sizes`, columnSizing) }, [tableKey, columnSizing])
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

      const nextAutoFollowing = followLogs && distanceFromBottom <= AUTO_FOLLOW_BOTTOM_THRESHOLD
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
  }, [data.length, followLogs])

  const visibleRows = table.getRowModel().rows
  const hasNoSourceData = data.length === 0
  const hasNoFilteredResults = data.length > 0 && visibleRows.length === 0

  return (
      <div className="h-full flex min-h-0">
        <div className="flex flex-col min-h-0 w-full">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Rows: {data?.length ?? 0}
            </div>
            <div>
              <button onClick={() => setIsDropdownOpen(true)} className="dropdown-toggle">
                <Cog width={18} height={18} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"/>
              </button>
              <Dropdown
                  isOpen={isDropdownOpen}
                  onClose={() => setIsDropdownOpen(false)}
                  className="w-50 p-2"
              >
                <div
                    className={'flex w-full items-center gap-2 font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                    onClick={() => setBeautifyJSON(v => !v)}
                >
                  <span className="flex-1">Beautify JSON</span>
                  {beautifyJSON ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : null}
                </div>
                <div
                    className={'flex w-full items-center gap-2 font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                    onClick={() => setAutoFitEnabled(value => !value)}
                >
                  <span className="flex-1 whitespace-nowrap">Auto-Fit Columns</span>
                  {autoFitEnabled ? <Check className="h-4 w-4 text-green-600 dark:text-green-400" /> : null}
                </div>
                <div
                    className={'flex w-full items-center gap-2 font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                    onClick={() => {
                      setColumnFilters([])
                      setBeautifyJSON(false)
                      setActiveFilterColumnId(null)
                      setSorting([])
                      setColumnSizing({})
                      setAutoFitEnabled(DEFAULT_AUTO_FIT_ENABLED)
                      // clear persisted state
                      storage.set(`${tableKey}:filters`, [])
                      storage.set(`${tableKey}:beautify`, false)
                      storage.set(`${tableKey}:sorting`, [])
                      storage.set(`${tableKey}:sizes`, {})
                      storage.set(`${tableKey}:autoFit`, DEFAULT_AUTO_FIT_ENABLED)
                    }}
                >
                  Reset
                </div>
                <DropdownItem
                    onItemClick={() => removeContainer(container)}
                    className="flex w-full font-normal text-left text-red-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-red-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                >
                  Delete
                </DropdownItem>
              </Dropdown>
            </div>
          </div>

          <div className="min-w-0 h-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div ref={parentRef} className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
              {hasNoSourceData ? (
                <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      No data yet
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Make sure you are in a live session and send data/load a file to populate this table
                    </div>
                  </div>
                </div>
              ) : (
              <div className="w-full">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="sticky top-0 z-10 dark:bg-gray-900 bg-gray-200 border-b border-gray-300 dark:border-gray-600 flex">
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
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
          </div>
        </div>
      </div>
  )
}
