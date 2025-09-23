"use client"

import { useDashboard } from '@/context/DashboardContext'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState, TableState,
  useReactTable
} from "@tanstack/react-table"
import { DashboardContainer, LogsModel } from '@/types/containers'
import React, { useCallback, useEffect, useRef, useState } from "react"
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
import { MoreHorizontal } from 'lucide-react'
import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'

// A custom component for a sortable header cell
const SortableHeader = ({header, table, isLast}: any) => {
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
  const getCellStyle = (width: number) => (
    isLast
      ? {
        minWidth: width,
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0
      }
      : {
        width,
        minWidth: width,
        maxWidth: width,
        flexShrink: 0,
        flexGrow: 0
      }
  )

  return (
    <div
      ref={ setNodeRef }
      //@ts-expect-error
      style={ {...style, ...getCellStyle(header.column.getSize())} }
      className="text-black dark:text-white select-none p-3 relative"
      { ...attributes }
    >
      <div className="flex items-center gap-2" { ...listeners }>
        { header.isPlaceholder ? null : (
          <div
            className="cursor-pointer flex items-center gap-1"
            onClick={ header.column.getToggleSortingHandler() }
          >
            { flexRender(header.column.columnDef.header, header.getContext()) }
            { header.column.getIsSorted() === "asc" && "▲" }
            { header.column.getIsSorted() === "desc" && "▼" }
          </div>
        ) }
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
        className={ `absolute right-0 top-4.5 h-[15px] w-0.5 cursor-col-resize select-none ${
          header.column.getIsResizing() ? "bg-blue-500" : "bg-gray-200"
        }` }
      />
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
      { row.getVisibleCells().map((cell: any, idx: number, arr: any[]) => (
        <div
          key={ cell.id }
          style={ cellStyle(cell.column.getSize(), idx === arr.length - 1) }
          className="p-3 text-black dark:text-white"
        >
          { flexRender(cell.column.columnDef.cell, cell.getContext()) }
        </div>
      )) }
    </div>
  )
})
VirtualizedTableRow.displayName = "VirtualizedTableRow"

export default function Logger({container}: { container: DashboardContainer<LogsModel> }) {
  const {logs, removeContainer} = useDashboard()
  const [ isDropdownOpen, setIsDropdownOpen ] = useState<boolean>(false)

  const [ columns, setColumns ] = useState<ColumnDef<LogsModel>[]>([])
  const [ sorting, setSorting ] = useState<SortingState>([])
  const [ columnFilters, setColumnFilters ] = useState<ColumnFiltersState>([])
  const [ showFilter, setShowFilter ] = useState<boolean>(false)
  const [ beautifyJSON, setBeautifyJSON ] = useState<boolean>(false)

  const [ columnOrder, setColumnOrder ] = useState<string[]>([])
  // NEW: Add columnSizing state
  const [ columnSizing, setColumnSizing ] = useState({})

  const parentRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    if (logs && logs.length > 0) {
      const keys = Object.keys(logs[0]) as (keyof LogsModel)[]
      const newColumns: ColumnDef<LogsModel>[] = keys.map((key) => ({
        accessorKey: key,
        header: key,
        cell: (info) => {
          const value = info.getValue() as unknown
          return typeof value === "number" && String(value).length === 13
            ? new Date(value).toLocaleString()
            : typeof value === "object"
              ? (beautifyJSON ? JSON.stringify(value, null, 2) : JSON.stringify(value))
              : String(value ?? "")
        },
        enableSorting: true,
        enableColumnFilter: true,
        enableResizing: true
      }))
      setColumns(newColumns)
      //@ts-expect-error
      setColumnOrder(newColumns.map(c => c.accessorKey as string))
    }
  }, [ logs, beautifyJSON ])

  const table = useReactTable({
    data: logs ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnOrder,
      columnSizing // Pass column sizing state to the table
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

  // Re-measure when column sizes, logs, or JSON beautification changes
  useEffect(() => {
    rowVirtualizer.measure()
  }, [ logs, beautifyJSON, columnSizingState, rowVirtualizer ])

  // Auto-scroll to the bottom when new logs are added
  useEffect(() => {
    if (logs.length > 0) {
      rowVirtualizer.scrollToIndex(logs.length - 1, {align: 'end'})
    }
  }, [ logs.length, rowVirtualizer ])

  const getCellStyle = (width: number, isLast = false) => (
    isLast
      ? {
        minWidth: width,
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0
      }
      : {
        width,
        minWidth: width,
        maxWidth: width,
        flexShrink: 0,
        flexGrow: 0
      }
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event
    if (active.id !== over?.id) {
      const oldIndex = columnOrder.findIndex(id => id === active.id)
      const newIndex = columnOrder.findIndex(id => id === over?.id)
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex)
      setColumnOrder(newOrder)
    }
  }

  return (
    <div className="h-full flex min-h-0">
      <div className="flex flex-col min-h-0 w-full">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Rows: { logs?.length ?? 0 }
          </div>
          <div>
            <button onClick={ () => setIsDropdownOpen(true) } className="dropdown-toggle">
              <MoreHorizontal className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"/>
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
                onClick={ () => {
                  setColumnFilters([])
                  setBeautifyJSON(false)
                  setShowFilter(false)
                } }
              >
                Beautify JSON
              </div>
              <div
                className={ 'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900' }
                onClick={ () => setBeautifyJSON(!beautifyJSON) }>
                Clear
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
        <div ref={ parentRef } className="h-full overflow-auto min-w-0 rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="w-full">
            <DndContext sensors={ sensors } collisionDetection={ closestCenter } onDragEnd={ handleDragEnd }>
              <div className="sticky top-0 z-10 dark:bg-gray-900 bg-gray-100 border-b dark:border-gray-600 flex">
                <SortableContext items={ columnOrder } strategy={ horizontalListSortingStrategy }>
                  { table.getHeaderGroups().map(headerGroup => (
                    headerGroup.headers.map((header, idx, arr) => (
                      <SortableHeader
                        key={ header.id }
                        header={ header }
                        table={ table }
                        isLast={ idx === arr.length - 1 }
                      />
                    ))
                  )) }
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
  )
}