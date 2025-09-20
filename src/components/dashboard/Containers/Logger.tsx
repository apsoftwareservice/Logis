"use client"
import dynamic from "next/dynamic"
import BaseView from '@/components/dashboard/BaseView'
import { TargetConfigurationPopover } from '@/components/ui/popover/TargetConfigurationPopover'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardContainer, LogsModel, TableModel } from '@/types/containers'
import { useEffect, useRef, useState } from "react"
// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false
})

export default function Logger({container}: { container: DashboardContainer<LogsModel> }) {
  const {index, registerObserver, logs} = useDashboard()

  // Maintain column order for the logs table
  const [columns, setColumns] = useState<string[]>([])
  const dragColIndex = useRef<number | null>(null)

  useEffect(() => {
    if (logs && logs.length > 0) {
      const keys = Object.keys(logs[0])
      if (columns.length === 0 || keys.join("|") !== columns.join("|")) {
        setColumns(keys)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs])

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragColIndex.current = index
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (dragColIndex.current === null) return
    const from = dragColIndex.current
    const to = index
    if (from === to) return
    const next = [...columns]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setColumns(next)
    dragColIndex.current = null
  }

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: crypto.randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const {timestampsMs, payloads} =
      eventBucket.getEventsInExclusiveInclusiveRange(Number.NEGATIVE_INFINITY, timestampMs) ??
      {timestampsMs: new Float64Array(0), payloads: []}

      if (payloads) {
        // setLogs(payloads)
      } else {
      }
    }
  })

  return (
    <BaseView body={
      <div className="h-full flex min-h-0">
        <div className="relative flex-1 min-h-0 w-full">
          <div className="h-full overflow-auto min-w-0">
            <Table className="text-sm font-mono w-full">
              <TableHeader className="sticky top-0 z-10 dark:bg-gray-900 bg-gray-200">
                {columns.length > 0 && (
                  <TableRow>
                    {columns.map((key, idx) => (
                      <TableCell
                        key={key}
                        className="font-bold text-black dark:text-white select-none p-3"
                      >
                        <div
                          className="cursor-move"
                          draggable
                          onDragStart={handleDragStart(idx)}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop(idx)}
                        >
                          {key}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                { logs.map((log, i) => (
                  <TableRow
                    key={ i }
                    className={`hover:bg-gray-300 dark:hover:bg-gray-700 ${i % 2 === 0 ? "bg-gray-100 dark:bg-gray-800" : "bg-gray-200 dark:bg-gray-900"} p-2`}
                  >
                    { columns.map((col, j) => {
                        const value = (log as Record<string, unknown>)[col]
                        return (
                          <TableCell className="text-black dark:text-white  whitespace-pre-wrap break-words px-4 py-2" key={ j }>
                            { typeof value === "number" && String(value).length === 13
                              ? new Date(value).toLocaleString()
                              : typeof value === "object"
                                ? JSON.stringify(value, null, 2)
                                : String(value ?? "")
                            }
                          </TableCell>
                        )
                      })
                    }
                  </TableRow>
                )) }
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    } configuration={
      <>
      </>
    } container={ container }/>
  )
}
