import React, { useEffect } from "react"
import { DashboardContainer, StatefulEventModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'
import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import success from '@lottie/success.json'
import loader from '@lottie/Loadder.json'
import { StatefulEventConfigurationPopover } from '@/components/ui/popover/StatefulEventConfigurationPopover'
import { randomUUID } from "@/lib/crypto-util"

export function StatefulEventView({container}: { container: DashboardContainer<StatefulEventModel> }) {
  const {registerObserver, index, setContainer} = useDashboard()
  const [ eventDidCalled, setEventDidCalled ] = React.useState(false)

  useEffect( () => {
    if(!index?.current) return
    registerObserver(eventObserver(container.data.startEvent, index.current!))
    registerObserver(eventObserver(container.data.stopEvent, index.current!))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ container ]);

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const startEventBucket = index.getBucket(container.data.startEvent)
      const stopEventBucket = index.getBucket(container.data.stopEvent)
      if(!startEventBucket || !stopEventBucket) return

      const lastStartEvent = startEventBucket.getLastEventAtOrBefore(timestampMs)
      const lastStopEvent = stopEventBucket.getLastEventAtOrBefore(timestampMs)

      const shouldBeCalled = !!lastStartEvent && (!lastStopEvent || lastStopEvent.timestampMs < lastStartEvent.timestampMs)

      setEventDidCalled(prev => {
        if (prev !== shouldBeCalled) {
          return shouldBeCalled // update only if different
        }
        return prev // do not update → avoids UI re-render
      })
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
            <LottieAnimation loop={ !eventDidCalled && !!container.data.startEvent && !!container.data.stopEvent } animationJson={ eventDidCalled ? success : loader }
                             className={ 'items-center justify-center align-middle flex' } height={ '60%' }
                             width={ '60%' }/>
          </motion.div>
        </div>
      } configuration={
      <>
        { index?.current && (
          <StatefulEventConfigurationPopover
            index={ index.current }
            currentStartEvent={ container.data.startEvent }
            currentStopEvent={ container.data.stopEvent }
            onChange={ (startEvent, stopEvent) => {
              setContainer({ ...container, data: {startEvent: startEvent, stopEvent: stopEvent } })
            } }
          />
        ) }
      </>
    } container={ container }
    />
  )
}
