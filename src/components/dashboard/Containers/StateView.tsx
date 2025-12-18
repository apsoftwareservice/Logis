import React, { useEffect, useRef, useState } from "react"
import { DashboardContainer, StateModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'
import { EventParameterConfigurationPopover } from '@/components/ui/popover/EventParameterConfigurationPopover'
import { getNestedValue } from '@/lib/utils'
import {randomUUID} from "@/lib/crypto-util";

export function StateView({container}: { container: DashboardContainer<StateModel> }) {
  const {registerObserver, index, setContainer} = useDashboard()
  const [ value, setValue ] = useState('')

  useEffect(() => {
    if(!index?.current) return
    registerObserver(eventObserver(container.data.event, index.current!))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ container ])

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const lastEvent = eventBucket.getLastEventAtOrBefore(timestampMs)

      if (lastEvent?.data && container.data.parameterKey) {
        setValue(getNestedValue(lastEvent.data as any, container.data.parameterKey))
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
          <EventParameterConfigurationPopover
            index={ index.current }
            currentEvent={ container.data.event }
            currentParameterKey={ container.data.parameterKey }
            onChange={ (event, parameterKey) => {
              setContainer({...container, data: {event: event, parameterKey: parameterKey}})
            } }
          />
        ) }
      </>
    } container={ container }
    />
  )
}
