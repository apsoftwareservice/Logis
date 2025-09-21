"use client"

import BaseView from '@/components/dashboard/BaseView'
import { useDashboard } from '@/context/DashboardContext'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { DashboardContainer, LogsModel } from '@/types/containers'
import React, { useEffect, useState, useRef } from "react"
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// A custom component for a sortable header cell
const SortableHeader = ({ header, table }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
  };

  // Get the dynamic cell style
  const getCellStyle = (width: number) => ({
    width,
    minWidth: width,
    maxWidth: width,
    flexShrink: 0,
    flexGrow: 0
  });

  return (
      <div
          ref={setNodeRef}
          //@ts-expect-error
          style={{ ...style, ...getCellStyle(header.column.getSize()) }}
          className="text-black dark:text-white select-none p-3 relative"
          {...attributes}
      >
        <div className="flex items-center gap-2" {...listeners}>
          {header.isPlaceholder ? null : (
              <div
                  className="cursor-pointer flex items-center gap-1"
                  onClick={header.column.getToggleSortingHandler()}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() === "asc" && "▲"}
                {header.column.getIsSorted() === "desc" && "▼"}
              </div>
          )}
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
            className={`absolute right-0 top-0 h-full w-2 cursor-col-resize select-none ${
                header.column.getIsResizing()
                    ? "bg-blue-500"
                    : "hover:bg-gray-200"
            }`}
        />
      </div>
  );
};

const VirtualizedTableRow = React.forwardRef(({ row, cellStyle, rowStyle, isEvenRow, ...props }: any, ref) => {
  return (
      <div
          ref={ref}
          className={`flex w-full text-sm font-mono whitespace-pre-wrap break-words border-b border-gray-200 dark:border-gray-700 ${isEvenRow ? "bg-gray-50 dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-900"}`}
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
VirtualizedTableRow.displayName = "VirtualizedTableRow";

export default function Logger({container}: { container: DashboardContainer<LogsModel> }) {
  const {logs, currentTimestamp} = useDashboard()

  const [columns, setColumns] = useState<ColumnDef<LogsModel>[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [showFilter, setShowFilter] = useState<boolean>(false)
  const [beautifyJSON, setBeautifyJSON] = useState<boolean>(false)

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  // NEW: Add columnSizing state
  const [columnSizing, setColumnSizing] = useState({});

  const parentRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor),
  );

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
        enableResizing: true,
      }))
      setColumns(newColumns)
      //@ts-expect-error
      setColumnOrder(newColumns.map(c => c.accessorKey as string))
    }
  }, [logs, beautifyJSON])

  const table = useReactTable({
    data: logs ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnOrder,
      columnSizing, // Pass column sizing state to the table
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing, // Set the handler for sizing changes
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
  });

  // Re-measure when column sizes, logs, or JSON beautification changes
  useEffect(() => {
    rowVirtualizer.measure();
  }, [logs, beautifyJSON, table.getState().columnSizing, rowVirtualizer]);

  // Auto-scroll to the bottom when new logs are added
  useEffect(() => {
    if (logs.length > 0) {
      rowVirtualizer.scrollToIndex(logs.length - 1, { align: 'end' });
    }
  }, [logs.length, rowVirtualizer]);

  const getCellStyle = (width: number) => ({
    width,
    minWidth: width,
    maxWidth: width,
    flexShrink: 0,
    flexGrow: 0,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = columnOrder.findIndex(id => id === active.id);
      const newIndex = columnOrder.findIndex(id => id === over?.id);
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      setColumnOrder(newOrder);
    }
  };

  return (
      <BaseView
          body={
            <div className="h-full flex min-h-0">
              <div className="relative flex-1 min-h-0 w-full">
                <div ref={parentRef} className="h-full overflow-auto min-w-0 rounded-2xl border">
                  <div className="w-full">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                      <div className="sticky top-0 z-10 dark:bg-gray-900 bg-blue-50 border-b flex">
                        <SortableContext
                            items={columnOrder}
                            strategy={horizontalListSortingStrategy}
                        >
                          {table.getHeaderGroups().map(headerGroup => (
                              headerGroup.headers.map(header => (
                                  <SortableHeader
                                      key={header.id}
                                      header={header}
                                      table={table}
                                  />
                              ))
                          ))}
                        </SortableContext>
                      </div>
                    </DndContext>

                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }} className="w-full">
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = table.getRowModel().rows[virtualRow.index];
                        return (
                            <VirtualizedTableRow
                                key={row.id}
                                row={row}
                                data-index={virtualRow.index}
                                isEvenRow={row.index % 2 === 0}
                                ref={rowVirtualizer.measureElement}
                                rowStyle={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  transform: `translateY(${virtualRow.start}px)`,
                                }}
                                cellStyle={getCellStyle}
                            />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          configuration={<>
            <div
                className={'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                onClick={() => setShowFilter(!showFilter)}>
              Use Filter
            </div>
            <div
                className={'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                onClick={() => setBeautifyJSON(!beautifyJSON)}>
              Beautify JSON
            </div>
          </>}
          container={container}
      />
  )
}