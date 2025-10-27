"use client"

import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import React, { useMemo, useState } from 'react'
import { DashboardContainer, LogsModel, TableModel } from '@/types/containers'
import { TableConfigurationPopover } from "@/components/ui/popover/TableConfigurationPopover"
import BaseView from '@/components/dashboard/BaseView'
import { ColumnDef } from '@tanstack/react-table'
import GenericTable from '@/components/tables/GenericTable'
import { randomUUID } from "@/lib/crypto-util"

export default function TableView({container}: { container: DashboardContainer<TableModel> }) {
  const {registerObserver, index} = useDashboard()
  const [ item, setItem ] = useState<object[]>([])

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: randomUUID(),
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

  const inferredColumns: ColumnDef<object, any>[] = useMemo(() => {
    if (!item || (item as []).length === 0) {
      return []
    }

    const keys = Object.keys(item[0]) as (keyof LogsModel)[]

    return keys.map(k => ({
      accessorKey: k,
      header: k
    }))

  }, [ item ])

  return (
    <BaseView
      body={ <GenericTable data={ item } columns={ inferredColumns } container={ container }/> }
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
      container={ container }
      eventObserver={ eventObserver }
    />
  )
}
