"use client"

import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table"
import { useDashboard } from '@/context/DashboardContext'
import { AnimatePresence, motion } from "framer-motion"
import { EventTypeIndex, Observer } from '@/parsers/engine'
import React, { useEffect, useReducer, useState } from 'react'
import { capitalize, cn, getNestedValue } from '@/lib/utils'
import { Check } from 'lucide-react'
import { DashboardContainer, TableModel } from '@/types/containers'
import { TableConfigurationPopover } from "@/components/ui/popover/TableConfigurationPopover"
import Image from 'next/image'

function titleReducer(_prev: string, nextContainerTitle: string | undefined) {
  // If container.title is defined, use it, otherwise fallback
  return nextContainerTitle ?? "Table";
}

export default function TableView({container}: { container: DashboardContainer<TableModel>}) {
  const {registerObserver, index, updateContainerTitle, lockGrid} = useDashboard()
  const [ item, setItem ] = useState<object[]>([])
  const MotionRow = motion.tr
  const [ title, dispatchTitle ] = useReducer(
    titleReducer,
    container.title ?? "Table"
  );

  // Whenever container.title changes, dispatch to reducer
  useEffect(() => {
    dispatchTitle(container.title);
  }, [container.title]);

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: crypto.randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const {timestampsMs, payloads} =
      eventBucket.getEventsInExclusiveInclusiveRange(Number.NEGATIVE_INFINITY, timestampMs) ??
      {timestampsMs: new Float64Array(0), payloads: []}

      if (payloads && Array.isArray(payloads)) {
        const next = payloads as object[]
        setItem([ ...next ])

      }
    }
  })

  return (
    <div
      className="w-full h-full overflow-y-auto rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className={ 'flex gap-2 items-center align-middle' }>
          <input
            type="text"
            value={ title }
            onChange={ (e) => dispatchTitle(e.target.value) }
            disabled={ lockGrid }
            className={ cn("text-lg font-semibold text-gray-800 dark:text-white/90 bg-transparent ", !lockGrid && "border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400") }
          />
          { !lockGrid && (
            <button onClick={ () => updateContainerTitle(container, title) }>
              <Check className={ 'text-green-600' }></Check>
            </button>
          ) }
        </div>

        <div className="flex items-start w-full gap-3 sm:justify-end">
          { index?.current && (
            <TableConfigurationPopover index={ index.current } container={ container } onChange={ (event) => {
              registerObserver(eventObserver(event, index.current!))
            } }/>
          ) }
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */ }
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              { container.data?.columns?.map((column, index) => (
                <TableCell
                  key={ index }
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  { capitalize(column.split('.').pop() ?? '') }
                </TableCell>
              )) }
            </TableRow>
          </TableHeader>

          {/* Table Body */ }

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            <AnimatePresence initial={ false } mode="popLayout">
              { item.map((item, index) => (
                <MotionRow key={ index } layout className="overflow-hidden">
                  { container.data.columns.map((column, index) => (
                    <TableCell key={index} className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      { /*@ts-ignore*/ }
                      { (getNestedValue(item, column)?.includes('http') || getNestedValue(item, column)?.includes('/')) ? (

                        <div className="flex items-center gap-3">
                          <div className="h-[50px] w-[50px] overflow-hidden rounded-md">
                            { /*@ts-ignore*/ }
                            <Image src={ getNestedValue(item, column) }
                                   width={ 50 }
                                   height={ 50 }
                                   className="h-[50px] w-[50px]"
                                   alt={ 'image' }
                            />
                          </div>
                        </div>

                      ) : (
                        <>
                          { /*@ts-ignore*/ }
                          { getNestedValue(item, column) }
                        </>
                      ) }
                    </TableCell>
                  )) }
                </MotionRow>
              )) }
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
