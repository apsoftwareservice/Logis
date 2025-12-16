import React, { useEffect, useRef, useState } from "react"
import { DashboardContainer, StateModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'
import { MetricConfigurationPopover } from '@/components/ui/popover/MetricConfigurationPopover'
import { getNestedValue } from '@/lib/utils'
import {randomUUID} from "@/lib/crypto-util";

export function StateView({container}: { container: DashboardContainer<StateModel> }) {
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
    id: randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const lastEvent = eventBucket.getLastEventAtOrBefore(timestampMs)

      if (lastEvent?.data && valueRef.current.parameterKey) {
        setValue(getNestedValue(lastEvent.data as any, valueRef.current.parameterKey))
      } else
        setValue('-')
    }
  })

  return (
    <BaseView body={
      <div className="flex w-full h-full justify-center items-center">
        <h4 className="font-bold text-gray-800 text-sm dark:text-white/90">
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
    />
  )
}
