import React, { useEffect, useRef, useState } from "react"
import { DashboardContainer, StateModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'
import { MetricConfigurationPopover } from '@/components/ui/popover/MetricConfigurationPopover'
import { getNestedValue } from '@/lib/utils'

export function DashboardState({container}: { container: DashboardContainer<StateModel> }) {
  const {registerObserver, index} = useDashboard()
  const [ value, setValue ] = useState('')

  const valueRef = useRef({
    parameterKey: container.data.parameterKey
  })

  useEffect(() => {
    valueRef.current = {
      parameterKey: container.data.parameterKey
    }
  }, [ container ])

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: crypto.randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const {timestampsMs, payloads} =
      eventBucket.getEventsInExclusiveInclusiveRange(Number.NEGATIVE_INFINITY, timestampMs) ??
      {timestampsMs: new Float64Array(0), payloads: []}

      if (payloads && payloads.length > 0) {
        const lastPayload = payloads[payloads.length - 1] as any | undefined
        if (lastPayload && valueRef.current.parameterKey) {
          setValue(getNestedValue(lastPayload, valueRef.current.parameterKey))
        } else {
          setValue('-')
        }
      }
    }
  })

  return (
    <BaseView body={
      <div className="flex w-full h-full justify-center items-center">
        <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
          { value }
        </h4>
      </div>
    } configuration={
      <>
        { index?.current && (
          <MetricConfigurationPopover
            index={ index.current }
            container={ container }
            onChange={ (event) => {
              registerObserver(eventObserver(event, index.current!))
            } }
          />
        ) }
      </>
    } container={ container }
              eventObserver={ eventObserver }/>
  )
}
