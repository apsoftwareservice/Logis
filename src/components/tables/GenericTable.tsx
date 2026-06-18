"use client"

import {
  ColumnDef,
  ColumnFiltersState,
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
import { Check, Cog, Plus, X } from 'lucide-react'
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
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'
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
    longest * AUTO_FIT_CHAR_WIDTH + AUTO_FIT_CELL_PADDING
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

function CustomColumnBuilder<TData extends Record<string, any>>({
  sampleRow,
  onAdd,
  onCancel,
}: {
  sampleRow?: TData
  onAdd: (column: { label: string; path: string }) => void
  onCancel?: () => void
}) {
  const [ label, setLabel ] = useState('')
  const [ path, setPath ] = useState('')

  const reset = () => {
    setLabel('')
    setPath('')
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="space-y-1">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-200">Add custom column</div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Pick a nested value from the latest log row, then name it.
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

      <div className="mt-3 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Column value</div>
        {sampleRow ? (
          <div className="max-w-full">
            <NestedSelect
              data={sampleRow as NestedObject}
              value={path}
              onSelect={(selectedPath) => {
                const nextPath = String(selectedPath)
                setPath(nextPath)
                setLabel(nextPath)
              }}
            />
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Load logs first so we can inspect the JSON shape.
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => { reset(); onCancel?.() }}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!sampleRow || !path.trim()}
          onClick={() => {
            onAdd({
              label: label.trim() || path.trim(),
              path: path.trim(),
            })
            reset()
          }}
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
const SortableHeader = ({ header, table, autoFitEnabled }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: header.column.id })

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

  return (
      <div
          ref={setNodeRef}
          style={{ ...style, ...getCellStyle(header.column.getSize()) }}
          className="text-black dark:text-white select-none p-3 relative group bg-white dark:bg-gray-900"
      >
        <div className="flex items-center justify-between gap-2">
          {header.isPlaceholder ? null : (
              <button
                  type="button"
                  className="cursor-pointer flex items-center gap-1"
                  onClick={header.column.getToggleSortingHandler()}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() === "asc" && " ▲"}
                {header.column.getIsSorted() === "desc" && " ▼"}
              </button>
          )}
          {/* Drag handle */}
          <span
              aria-label="Drag column"
              className="cursor-grab select-none px-1 bg-white dark:bg-gray-900"
              {...attributes}
              {...listeners}
          >
          ⋮⋮
        </span>
        </div>

        {(table.getState().columnFilters.some((f: any) => f.id === header.column.id) || table.getState().showFilter) && (
            <div className="pt-2">
              <input
                  value={(header.column.getFilterValue() ?? "") as string}
                  onChange={e => header.column.setFilterValue(e.target.value)}
                  placeholder={`Filter...`}
                  className="w-full border rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-black dark:text-white"
              />
            </div>
        )}

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
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)

  // A stable key per table instance for persistence namespaces
  const tableKey = useMemo(() => `table:${container?.id ?? 'generic'}`, [container?.id])

  const [columns, setColumns] = useState<ColumnDef<TData, any>[]>([])
  const [sorting, setSorting] = useState<SortingState>(() => storage.get<SortingState>(`${tableKey}:sorting`, []))
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => storage.get<ColumnFiltersState>(`${tableKey}:filters`, []))
  const [showFilter, setShowFilter] = useState<boolean>(() => storage.get<boolean>(`${tableKey}:showFilter`, false))
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

  const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(KeyboardSensor)
  )

  // Map incoming columns once, and reconcile order & sizes
  useEffect(() => {
    const mapped = columnsProp.map((col: any) => col.cell ? col : {
      ...col,
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
      }
    })
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
      // @ts-expect-error custom UI state
      showFilter,
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
  useEffect(() => { storage.set(`${tableKey}:showFilter`, showFilter) }, [tableKey, showFilter])
  useEffect(() => { storage.set(`${tableKey}:beautify`, beautifyJSON) }, [tableKey, beautifyJSON])
  useEffect(() => { storage.set(`${tableKey}:order`, columnOrder) }, [tableKey, columnOrder])
  useEffect(() => { storage.set(`${tableKey}:sizes`, columnSizing) }, [tableKey, columnSizing])
  useEffect(() => { storage.set(`${tableKey}:hiddenColumns`, hiddenColumns) }, [tableKey, hiddenColumns])
  useEffect(() => { storage.set(`${tableKey}:customColumns`, customColumns) }, [tableKey, customColumns])
  useEffect(() => { storage.set(`${tableKey}:autoFit`, autoFitEnabled) }, [autoFitEnabled, tableKey])

  useEffect(() => {
    if (!followLogs) return
    rowVirtualizer.scrollToIndex(data.length, { align: "start" })
  }, [data, followLogs, rowVirtualizer]);

  const hasNoRows = data.length === 0
  const hasNoVisibleColumns = visibleColumns.length === 0
  const sampleRow = data[0]

  return (
      <div className="h-full flex min-h-0">
        <div className="flex flex-col min-h-0 w-full">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Rows: {data?.length ?? 0}
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
                      sampleRow={sampleRow as TData | undefined}
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
                      onSelect={() => setShowFilter(!showFilter)}
                  >
                    Use Filter
                  </DropdownMenuItem>
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
                        setShowFilter(false)
                        setSorting([])
                        setColumnSizing({})
                        setHiddenColumns([])
                        setCustomColumns([])
                        setAutoFitEnabled(DEFAULT_AUTO_FIT_ENABLED)
                        // clear persisted state
                        storage.set(`${tableKey}:filters`, [])
                        storage.set(`${tableKey}:beautify`, false)
                        storage.set(`${tableKey}:showFilter`, false)
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

          <div className="min-w-0 h-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div ref={parentRef} className="h-full overflow-auto" style={{ scrollbarGutter: 'stable' }}>
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
                              <SortableHeader key={header.id} header={header} table={table} autoFitEnabled={autoFitEnabled} />
                          ))
                      ))}
                      <div className="flex-1"/>
                    </SortableContext>
                  </div>
                </DndContext>

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
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
  )
}
