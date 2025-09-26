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
import React, { useEffect, useRef, useState } from "react"
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
import { Cog, Settings2 } from 'lucide-react'
import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DashboardContainer } from '@/types/containers'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'
import { useDashboard } from '@/context/DashboardContext'

// A custom component for a sortable header cell
const SortableHeader = ({header, table}: any) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: header.column.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative'
  }

  // Get the dynamic cell style
  const getCellStyle = (width: number) => ({
    width,
    minWidth: width,
    maxWidth: width,
    flexShrink: 0,
    flexGrow: 0
  })

  return (
    <div
      ref={ setNodeRef }
      //@ts-expect-error
      style={ {...style, ...getCellStyle(header.column.getSize())} }
      className="text-black dark:text-white select-none p-3 relative group"
    >
      <div className="flex items-center justify-between gap-2">
        { header.isPlaceholder ? null : (
          <button
            type="button"
            className="cursor-pointer flex items-center gap-1"
            onClick={ header.column.getToggleSortingHandler() }
          >
            { flexRender(header.column.columnDef.header, header.getContext()) }
            { header.column.getIsSorted() === "asc" && " ▲" }
            { header.column.getIsSorted() === "desc" && " ▼" }
          </button>
        ) }
        {/* Drag handle */ }
        <span
          aria-label="Drag column"
          className="cursor-grab select-none px-1"
          { ...attributes }
          { ...listeners }
        >
          ⋮⋮
        </span>
      </div>
      { (table.getState().columnFilters.some((f: any) => f.id === header.column.id) || table.getState().showFilter) && (
        <div className="pt-2">
          <input
            value={ (header.column.getFilterValue() ?? "") as string }
            onChange={ e => header.column.setFilterValue(e.target.value) }
            placeholder={ `Filter...` }
            className="w-full border rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-black dark:text-white"
          />
        </div>
      ) }
      <div
        onMouseDown={ header.getResizeHandler() }
        onTouchStart={ header.getResizeHandler() }
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

const VirtualizedTableRow = React.forwardRef(({row, cellStyle, rowStyle, isEvenRow, ...props}: any, ref) => {
  return (
    <div
      ref={ ref }
      className={ `flex w-full text-sm font-mono whitespace-pre-wrap break-words ${ isEvenRow ? "bg-gray-50 dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-900" }` }
      style={ rowStyle }
      { ...props }
    >
      { row.getVisibleCells().map((cell: any) => (
        <div
          key={ cell.id }
          style={ cellStyle(cell.column.getSize()) }
          className="p-3 text-black dark:text-white"
        >
          { flexRender(cell.column.columnDef.cell, cell.getContext()) }
        </div>
      )) }
    </div>
  )
})
VirtualizedTableRow.displayName = "VirtualizedTableRow"

export default function GenericTable<TData extends Record<string, any>>({
                                                                          data,
                                                                          columns: columnsProp,
                                                                          container
                                                                        }: {
  data: TData[]
  columns: ColumnDef<TData, any>[],
  container: DashboardContainer<any>
}) {
  const {removeContainer} = useDashboard()
  const [ isDropdownOpen, setIsDropdownOpen ] = useState<boolean>(false)

  const [ columns, setColumns ] = useState<ColumnDef<TData, any>[]>([])
  const [ sorting, setSorting ] = useState<SortingState>([])
  const [ columnFilters, setColumnFilters ] = useState<ColumnFiltersState>([])
  const [ showFilter, setShowFilter ] = useState<boolean>(false)
  const [ beautifyJSON, setBeautifyJSON ] = useState<boolean>(false)

  const [ columnOrder, setColumnOrder ] = useState<string[]>([])
  // NEW: Add columnSizing state
  const [ columnSizing, setColumnSizing ] = useState({})

  const parentRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    // Map incoming columns; if no custom cell, provide a default renderer that honors Beautify JSON
    const mapped = columnsProp.map((col: any) => {
      if (col.cell) return col
      return {
        ...col,
        cell: (info: any) => {
          const value = info.getValue() as unknown
          return typeof value === 'number' && String(value).length === 13
            ? new Date(value).toLocaleString()
            : typeof value === 'object'
              ? (beautifyJSON ? JSON.stringify(value, null, 2) : JSON.stringify(value))
              : String(value ?? '')
        }
      }
    })
    setColumns(mapped)
    // Initialize column order from accessorKey/id when columns change
    setColumnOrder(mapped.map((c: any) => (c.accessorKey as string) ?? (c.id as string)).filter(Boolean))
  }, [ columnsProp, beautifyJSON ])

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnOrder,
      columnSizing,
      //@ts-expect-error
      showFilter
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing, // Set the handler for sizing changes
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange"
  })

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 15
  })

  // Extract column sizing state once per render to avoid complex expressions in deps
  const columnSizingState = table.getState().columnSizing

  // Re-measure when column sizes, data, or JSON beautification changes
  useEffect(() => {
    rowVirtualizer.measure()
  }, [ data, beautifyJSON, columnSizingState, rowVirtualizer ])

  const getCellStyle = (width: number) => ({
    width,
    minWidth: width,
    maxWidth: width,
    flexShrink: 0,
    flexGrow: 0
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event
    if (!over || active.id === over.id) return
    const oldIndex = columnOrder.findIndex(id => id === active.id)
    const newIndex = columnOrder.findIndex(id => id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(columnOrder, oldIndex, newIndex)
    setColumnOrder(newOrder)
  }

  return (
    <div className="h-full flex min-h-0">
      <div className="flex flex-col min-h-0 w-full">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Rows: { data?.length ?? 0 }
          </div>
          <div>
            <button onClick={ () => setIsDropdownOpen(true) } className="dropdown-toggle">
              <Cog width={18} height={18} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"/>
            </button>
            <Dropdown
              isOpen={ isDropdownOpen }
              onClose={ () => setIsDropdownOpen(false) }
              className="w-40 p-2"
            >
              <div
                className={ 'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900' }
                onClick={ () => setShowFilter(!showFilter) }>
                Use Filter
              </div>
              <div
                className={ 'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900' }
                onClick={ () => setBeautifyJSON((v) => !v) }
              >
                Beautify JSON
              </div>
              <div
                className={ 'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900' }
                onClick={ () => {
                  setColumnFilters([])
                  setBeautifyJSON(false)
                  setShowFilter(false)
                } }
              >
                Reset
              </div>
              <DropdownItem
                onItemClick={ () => removeContainer(container) }
                className="flex w-full font-normal text-left text-red-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-red-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                Delete
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
        <div
          className="min-w-0 h-full rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div ref={ parentRef } className="h-full overflow-auto" style={ {scrollbarGutter: 'stable'} }>
            <div className="w-full">
              <DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ handleDragEnd }>
                <div
                  className="sticky top-0 z-10 dark:bg-gray-900 bg-gray-200 border-b border-gray-300 dark:border-gray-600 flex">
                  <SortableContext items={ columnOrder } strategy={ horizontalListSortingStrategy }>
                    { table.getHeaderGroups().map(headerGroup => (
                      headerGroup.headers.map((header) => (
                        <SortableHeader
                          key={ header.id }
                          header={ header }
                          table={ table }
                        />
                      ))
                    )) }
                    <div className="flex-1"/>
                  </SortableContext>
                </div>
              </DndContext>
              <div style={ {height: `${ rowVirtualizer.getTotalSize() }px`, position: 'relative'} }
                   className="w-full">
                { rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = table.getRowModel().rows[virtualRow.index]
                  return (
                    <VirtualizedTableRow
                      key={ row.id }
                      row={ row }
                      data-index={ virtualRow.index }
                      isEvenRow={ row.index % 2 === 0 }
                      ref={ rowVirtualizer.measureElement }
                      rowStyle={ {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${ virtualRow.start }px)`
                      } }
                      cellStyle={ getCellStyle }
                    />
                  )
                }) }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}