import React, { useEffect, useRef } from "react"
import { DashboardContainer, EventModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'
import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import success from '@lottie/success.json'
import loader from '@lottie/Loadder.json'
import { EventConfigurationPopover } from '@/components/ui/popover/EventConfigurationPopover'
import { getNestedValue } from '@/lib/utils'

export function DashboardEvent({container}: { container: DashboardContainer<EventModel> }) {
  const {registerObserver, index} = useDashboard()
  const [ eventDidCalled, setEventDidCalled ] = React.useState(false)

  const valueRef = useRef({
    lastState: container.data.lastState,
  })

  useEffect(() => {
    valueRef.current = {
      lastState: container.data.lastState,
    }
  }, [ container ])

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: crypto.randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const {timestampMs: _, data} = eventBucket.getLastEventAtOrBefore(timestampMs) ??
      {timestampMs: new Float64Array(0)}

      if (eventDidCalled !== valueRef.current.lastState !== undefined) {
        setEventDidCalled(valueRef.current.lastState !== undefined)
      }
    }
  })

  return (
    <BaseView
      className={ '' }
      body={
        <div className="flex w-full h-full justify-center items-center overflow-hidden">
          <motion.div
            initial={ {opacity: 0, y: 10} }
            animate={ {opacity: 1, y: 0} }
            transition={ {duration: 0.6, ease: 'easeOut'} }
          >
            <LottieAnimation loop={ container.event !== '' || eventDidCalled } animationJson={ eventDidCalled ? success : loader }
                             className={ 'items-center justify-center align-middle flex' } height={ '60%' }
                             width={ '60%' }/>
          </motion.div>
        </div>
      } configuration={
      <>
        { index?.current && (
          <EventConfigurationPopover
            index={ index.current }
            container={ container }
            onChange={ (event) => {
              registerObserver(eventObserver(event, index.current!))
            } }
          />
        ) }
      </>
    } container={ container }/>
  )
}
