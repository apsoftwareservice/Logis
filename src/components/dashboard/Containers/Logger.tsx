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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DashboardContainer, LogsModel } from '@/types/containers'
import React, { useEffect, useState, useRef } from "react" // <-- Import useRef

export default function Logger({container}: { container: DashboardContainer<LogsModel> }) {
  const {logs, currentTimestamp, cachedDateKey} = useDashboard()

  const [columns, setColumns] = useState<ColumnDef<LogsModel>[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [showFilter, setShowFilter] = useState<boolean>(false)
  const [beautifyJSON, setBeautifyJSON] = useState<boolean>(false)

  // Create a ref to store a map of row elements
  const rowRefs = useRef<Map<string, HTMLTableRowElement | null>>(new Map());

  // Use a ref for the table container to get a reference to it
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // This useEffect will scroll to the row when currentTimestamp changes
  useEffect(() => {
    const rowsLength = table.getRowModel().rows.length
    if (currentTimestamp && rowsLength > 0) {
      // Get the row ID from the TanStack table instance
      const rowId = table.getRowModel().rows[rowsLength - 1]?.id;

      if (rowId) {
        // Get the row DOM element from the refs map
        const rowElement = rowRefs.current.get(rowId);

        if (rowElement) {
          // Scroll the element into view with smooth behavior
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [ currentTimestamp, logs ]);

  useEffect(() => {
    if (logs && logs.length > 0) {
      const keys = Object.keys(logs[0]) as (keyof LogsModel)[]

      setColumns(
          keys.map((key) => ({
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
            // enable sorting + filtering + resizing
            enableSorting: true,
            enableColumnFilter: true,
            enableResizing: true,
          }))
      )
    }
  }, [ logs, beautifyJSON ])

  const table = useReactTable({
    data: logs ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange",
  })

  // Function to set the ref for each row
  const setRowRef = (rowId: string, element: HTMLTableRowElement | null) => {
    if (element) {
      rowRefs.current.set(rowId, element);
    } else {
      rowRefs.current.delete(rowId);
    }
  };

  return (
      <BaseView
          body={
            <div className="h-full flex min-h-0">
              <div className="relative flex-1 min-h-0 w-full">
                {/* Add a ref to the container for better scroll control */}
                <div ref={tableContainerRef} className="h-full overflow-auto min-w-0 rounded-2xl border">
                  <Table className="text-sm font-mono w-full border-collapse">
                    <TableHeader className="sticky top-0 z-10 dark:bg-gray-900 bg-blue-50 border-b">
                      {table.getHeaderGroups().map(headerGroup => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <TableCell
                                    key={header.id}
                                    isHeader={true}
                                    style={{ width: header.column.getSize() }}
                                    className="text-black dark:text-white select-none p-0 relative"
                                >
                                  <div className="px-3 py-2 flex items-center gap-2">
                                    {header.isPlaceholder ? null : (
                                        <div
                                            className="cursor-pointer flex items-center gap-1"
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                          {flexRender(header.column.columnDef.header, header.getContext())}
                                          {/* Sorting indicator */}
                                          {header.column.getIsSorted() === "asc" && "▲"}
                                          {header.column.getIsSorted() === "desc" && "▼"}
                                        </div>
                                    )}
                                  </div>
                                  {/* Filter input */}
                                  {(showFilter && header.column.getCanFilter()) && (
                                      <div className="px-2 pb-2">
                                        <input
                                            value={(header.column.getFilterValue() ?? "") as string}
                                            onChange={e => header.column.setFilterValue(e.target.value)}
                                            placeholder={`Filter...`}
                                            className="w-full border rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-black dark:text-white"
                                        />
                                      </div>
                                  )}
                                  {/* Resize handle */}
                                  <div
                                      onMouseDown={header.getResizeHandler()}
                                      onTouchStart={header.getResizeHandler()}
                                      className={`absolute right-0 top-2.5 h-[50%] w-0.5 cursor-col-resize select-none ${
                                          header.column.getIsResizing()
                                              ? "bg-blue-500"
                                              : "bg-gray-200 hover:bg-blue-300"
                                      }`}
                                  />
                                </TableCell>
                            ))}
                          </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                          <TableRow
                              key={row.id}
                              // Set the ref for each row using the new helper function
                              //@ts-expect-error
                              ref={el => setRowRef(row.id, el)}
                              className={`${
                                  row.index % 2 === 0
                                      ? "bg-gray-50 dark:bg-gray-800"
                                      : "bg-gray-100 dark:bg-gray-900"
                              }`}
                          >
                            {row.getVisibleCells().map(cell => (
                                <TableCell
                                    key={cell.id}
                                    style={{ width: cell.column.getSize() }}
                                    className="text-black dark:text-white whitespace-pre-wrap break-words px-3 py-2"
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                          </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          }
          configuration={<>
            <div
                className={'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300  px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                onClick={() => setShowFilter(!showFilter)}>
              Use Filter
            </div>
            <div
                className={'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300  px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900'}
                onClick={() => setBeautifyJSON(!beautifyJSON)}>
              Beautify JSON
            </div>
          </>}
          container={container}
      />
  )
}