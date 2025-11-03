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
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Cog } from 'lucide-react'
import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DashboardContainer } from '@/types/containers'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'
import { useDashboard } from '@/context/DashboardContext'

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
const SortableHeader = ({ header, table }: any) => {
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
          className="text-black dark:text-white select-none p-3 relative group"
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
              className="cursor-grab select-none px-1"
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
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            className="absolute right-0 top-2 h-full w-3 cursor-col-resize select-none"
        >
          <div
              className={
                  `mx-auto h-[70%] w-0.5 rounded-full transition-colors duration-150 ` +
                  (header.column.getIsResizing()
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
                                                                        }: {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  container: DashboardContainer<any>
}) {
  const { removeContainer } = useDashboard()
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false)

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

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnOrder,
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
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
  })

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 15,
    // Keep stable key so DOM nodes match indices
    getItemKey: (index) => table.getRowModel().rows[index]?.id ?? index,
    // Use DOM height to measure
    measureElement: (el) => (el as HTMLElement).getBoundingClientRect().height,
  })

  // Re-measure when column sizes, data, or JSON beautification changes
  useEffect(() => {
    requestAnimationFrame(() => rowVirtualizer.measure())
  }, [data, beautifyJSON, table.getState().columnSizing])

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
  useEffect(() => { storage.set(`${tableKey}:showFilter`, showFilter) }, [tableKey, showFilter])
  useEffect(() => { storage.set(`${tableKey}:beautify`, beautifyJSON) }, [tableKey, beautifyJSON])
  useEffect(() => { storage.set(`${tableKey}:order`, columnOrder) }, [tableKey, columnOrder])
  useEffect(() => { storage.set(`${tableKey}:sizes`, columnSizing) }, [tableKey, columnSizing])

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
                  className="w-40 p-2"
              >
                <div
                    className={'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                    onClick={() => setShowFilter(!showFilter)}
                >
                  Use Filter
                </div>
                <div
                    className={'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                    onClick={() => setBeautifyJSON(v => !v)}
                >
                  Beautify JSON
                </div>
                <div
                    className={'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                    onClick={() => {
                      setColumnFilters([])
                      setBeautifyJSON(false)
                      setShowFilter(false)
                      setSorting([])
                      setColumnSizing({})
                      // clear persisted state
                      storage.set(`${tableKey}:filters`, [])
                      storage.set(`${tableKey}:beautify`, false)
                      storage.set(`${tableKey}:showFilter`, false)
                      storage.set(`${tableKey}:sorting`, [])
                      storage.set(`${tableKey}:sizes`, {})
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
              <div className="w-full">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="sticky top-0 z-10 dark:bg-gray-900 bg-gray-200 border-b border-gray-300 dark:border-gray-600 flex">
                    <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                      {table.getHeaderGroups().map(headerGroup => (
                          headerGroup.headers.map((header) => (
                              <SortableHeader key={header.id} header={header} table={table} />
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
            </div>
          </div>
        </div>
      </div>
  )
}