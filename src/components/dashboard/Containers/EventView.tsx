import React, {useEffect} from "react"
import { DashboardContainer, EventModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'
import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import success from '@lottie/success.json'
import loader from '@lottie/Loadder.json'
import { EventConfigurationPopover } from '@/components/ui/popover/EventConfigurationPopover'
import { randomUUID } from "@/lib/crypto-util"

export function EventView({container}: { container: DashboardContainer<EventModel> }) {
  const {registerObserver, index, setContainer} = useDashboard()
  const [ eventDidCalled, setEventDidCalled ] = React.useState(false)

  useEffect( () => {
    if(!index?.current) return
    registerObserver(eventObserver(container.data.event, index.current!))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ container ]);

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)
      if (!eventBucket) return 0

      const lastEvent = eventBucket.getLastEventAtOrBefore(timestampMs)
      const shouldBeCalled = !!lastEvent

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
            <LottieAnimation loop={ !eventDidCalled && !!container.data.event } animationJson={ eventDidCalled ? success : loader }
                             className={ 'items-center justify-center align-middle flex' } height={ '60%' }
                             width={ '60%' }/>
          </motion.div>
        </div>
      } configuration={
      <>
        { index?.current && (
          <EventConfigurationPopover
            index={ index.current }
            currentValue={ container.data.event }
            onChange={ (event: string) => {
              setContainer({
                ...container,
                data: { event: event }
              })
            } }
          />
        ) }
      </>
    } container={ container }/>
  )
}
