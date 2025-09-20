import React from "react"
import { DashboardContainer, TableModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'

export function DashboardMetrics({container}: { container: DashboardContainer<TableModel> }) {
  const {registerObserver} = useDashboard()

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


      }
    }
  })

  return (
    <BaseView body={
      <div className="flex w-full h-full justify-center items-center">
          <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
            3,782
          </h4>
      </div>
    } configuration={
      <></>
    } container={ container }/>
  )
}
