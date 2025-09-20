"use client"

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { useDashboard } from '@/context/DashboardContext'
import { AnimatePresence, motion } from "framer-motion"
import { EventTypeIndex, Observer } from '@/core/engine'
import React, { useState } from 'react'
import { capitalize, getNestedValue } from '@/lib/utils'
import { DashboardContainer, TableModel } from '@/types/containers'
import { TableConfigurationPopover } from "@/components/ui/popover/TableConfigurationPopover"
import Image from 'next/image'
import BaseView from '@/components/dashboard/BaseView'

export default function TableView({container}: { container: DashboardContainer<TableModel> }) {
  const {registerObserver, index} = useDashboard()
  const [ item, setItem ] = useState<object[]>([])
  const MotionRow = motion.tr

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
    <BaseView body={
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
                  <TableCell key={ index } className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
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
    }
    configuration={
      <>
      { index?.current && (
          <TableConfigurationPopover index={ index.current! } container={ container } onChange={ (event) => {
            registerObserver(eventObserver(event, index.current!))
          } }/>
        )
      }
      </>
    }
    container={ container }></BaseView>
  )
}
