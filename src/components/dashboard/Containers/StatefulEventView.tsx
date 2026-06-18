import React, { useEffect } from "react"
import { Check, LoaderCircle } from "lucide-react"
import { DashboardContainer, StatefulEventModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { EventBucket, EventTypeIndex, Observer } from '@/core/engine'
import BaseView from '@/components/dashboard/BaseView'
import { motion } from 'framer-motion'
import { StatefulEventConfigurationPopover } from '@/components/ui/popover/StatefulEventConfigurationPopover'
import { randomUUID } from "@/lib/crypto-util"
import { getNestedValue, cn } from "@/lib/utils";
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'

type StatefulPhase = 'waiting' | 'active' | 'completed'

type StatefulSnapshot = {
  phase: StatefulPhase
  parameter: string
  completedCycles: number
}

const initialSnapshot: StatefulSnapshot = {
  phase: 'waiting',
  parameter: '',
  completedCycles: 0,
}

function countCompletedCycles(startBucket: EventBucket, stopBucket: EventBucket, timestampMs: number) {
  const startEvents = startBucket.getEventsInExclusiveInclusiveRange(Number.NEGATIVE_INFINITY, timestampMs).timestampsMs
  const stopEvents = stopBucket.getEventsInExclusiveInclusiveRange(Number.NEGATIVE_INFINITY, timestampMs).timestampsMs

  let completedCycles = 0
  let startIndex = 0

  for (let stopIndex = 0; stopIndex < stopEvents.length && startIndex < startEvents.length; stopIndex++) {
    while (startIndex < startEvents.length && startEvents[startIndex] <= stopEvents[stopIndex]) {
      startIndex++
    }

    if (startIndex > completedCycles) {
      completedCycles++
    }
  }

  return completedCycles
}

function EventStatusIcon({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300">
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
    )
  }

  return <LoaderCircle className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" />
}

export function StatefulEventView({container}: { container: DashboardContainer<StatefulEventModel> }) {
  const {registerObserver, index, setContainer} = useDashboard()
  const [ snapshot, setSnapshot ] = React.useState<StatefulSnapshot>(initialSnapshot)

  useEffect( () => {
    if(!index?.current) return
    registerObserver(eventObserver(container.data.startEvent, index.current!))
    registerObserver(eventObserver(container.data.stopEvent, index.current!))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ container, index?.current ]);

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const startEventBucket = index.getOrCreateBucket(container.data.startEvent)
      const stopEventBucket = index.getOrCreateBucket(container.data.stopEvent)

      const lastStartEvent = startEventBucket.getLastEventAtOrBefore(timestampMs)
      const lastStopEvent = stopEventBucket.getLastEventAtOrBefore(timestampMs)

      const parameterValue = lastStartEvent?.data && container.data.parameterKey
        ? getNestedValue(lastStartEvent.data as any, container.data.parameterKey)
        : ''
      const parameter = parameterValue === '' || parameterValue == null ? '' : String(parameterValue)

      const phase: StatefulPhase = !lastStartEvent
        ? 'waiting'
        : !lastStopEvent || lastStopEvent.timestampMs < lastStartEvent.timestampMs
          ? 'active'
          : 'completed'

      const completedCycles = countCompletedCycles(startEventBucket, stopEventBucket, timestampMs)

      setSnapshot(prev => {
        if (
          prev.phase === phase &&
          prev.parameter === parameter &&
          prev.completedCycles === completedCycles
        ) {
          return prev
        }

        return {
          phase,
          parameter,
          completedCycles,
        }
      })
    }
  })

  const startCompleted = snapshot.phase === 'active'
  const stopVisible = snapshot.phase === 'active'
  const valueText = snapshot.phase === 'active' && snapshot.parameter !== '' ? snapshot.parameter : '—'
  const startLabel = container.data.startEvent || 'Start event'
  const stopLabel = container.data.stopEvent || 'End event'
  const pairCompleted = snapshot.phase === 'completed'

  return (
    <BaseView
      className={ '' }
      body={
      <motion.div
        initial={ {opacity: 0, y: 10} }
        animate={ {opacity: 1, y: 0} }
        transition={ {duration: 0.6, ease: 'easeOut'} }
        className="flex h-full w-full flex-col justify-center gap-3 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <EventStatusIcon complete={ startCompleted } />
              <span className="truncate">{ startLabel }</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              { stopVisible ? <LoaderCircle className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" /> : <span className="h-4 w-4" /> }
              <span className="truncate">{ stopLabel }</span>
            </div>
          </div>
          <div className="shrink-0">
            <TooltipWrapper
              side="top"
              content={
                <div className="max-w-48 text-xs leading-5">
                  Number of completed start/stop pairs seen up to the current timeline position.
                </div>
              }
              className="max-w-56 bg-gray-900 text-white dark:bg-white dark:text-gray-900"
            >
              <span className={ cn(
                "inline-flex cursor-help items-center rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] transition-all",
                pairCompleted
                  ? "border-green-300 bg-green-50 text-green-700 shadow-[0_0_0_1px_rgba(34,197,94,0.22),0_0_14px_rgba(34,197,94,0.28)] dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-300 dark:shadow-[0_0_0_1px_rgba(74,222,128,0.18),0_0_14px_rgba(74,222,128,0.24)]"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
              ) }>
                { snapshot.completedCycles } stateful-events
              </span>
            </TooltipWrapper>
          </div>
        </div>

        <div className="min-h-12 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-white/[0.04]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Value
          </div>
          <div className={ cn(
            "mt-1 break-words text-sm font-semibold",
            valueText === '—'
              ? "text-gray-400 dark:text-gray-500"
              : "text-gray-800 dark:text-white/90"
          ) }>
            { valueText }
          </div>
        </div>
      </motion.div>
      } configuration={
      <>
        { index?.current && (
          <StatefulEventConfigurationPopover
            index={ index.current }
            currentStartEvent={ container.data.startEvent }
            currentStopEvent={ container.data.stopEvent }
            currentParameterKey={ container.data.parameterKey }
            onChange={ (startEvent, stopEvent, parameterKey) => {
              setContainer({ ...container, data: {startEvent: startEvent, stopEvent: stopEvent, parameterKey: parameterKey} })
            } }
          />
        ) }
      </>
    } container={ container }
    />
  )
}
