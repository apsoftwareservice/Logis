"use client"
import { ApexOptions } from "apexcharts"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import BaseView from '@/components/dashboard/BaseView'
import { DashboardContainer, DEFAULT_TARGET_MAX_VALUE, TargetModel } from '@/types/containers'
import { TargetConfigurationPopover } from '@/components/ui/popover/TargetConfigurationPopover'
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import { getNestedValue } from '@/lib/utils'
import { randomUUID } from "@/lib/crypto-util"

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false
})

export default function TargetView({container}: { container: DashboardContainer<TargetModel> }) {
  const {index, registerObserver, setContainer} = useDashboard()
  const [ percentage, setPercentage ] = useState(0)
  const [ currentValue, setCurrentValue ] = useState(0)

  const targetMaxValue = container.data.maxValue || DEFAULT_TARGET_MAX_VALUE
  const visualPercentage = Math.min(Math.max(percentage, 0), 100)
  const isOverMax = percentage > 100
  const gaugeColor = isOverMax ? "#EF4444" : "#465FFF"
  const series = [ visualPercentage ]

  const options: ApexOptions = useMemo(() => ({
    colors: [ gaugeColor ],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: {
        enabled: true
      }
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: {
          size: "80%"
        },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5
        },
        dataLabels: {
          name: {
            show: false
          },
          value: {
            show: false
          }
        }
      }
    },
    fill: {
      type: "solid",
      colors: [ gaugeColor ]
    },
    stroke: {
      lineCap: "round"
    },
    labels: [ 'Progress' ]
  }), [ gaugeColor ])

  useEffect(() => {
    if(!index?.current) return
    registerObserver(eventObserver(container.data.event, index.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ container, index?.current ])

  const eventObserver = (event: string, eventIndex: EventTypeIndex): Observer => ({
    id: randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = eventIndex.getBucket(event)

      if (!eventBucket) return 0

      const { data } = eventBucket.getLastEventAtOrBefore(timestampMs) ??
      { timestampMs: new Float64Array(0), data: [] }

      if (data && container.data.parameterKey) {
        const rawValue = getNestedValue(data as any, container.data.parameterKey)
        const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
        const maxValue = container.data.maxValue || DEFAULT_TARGET_MAX_VALUE

        if (Number.isFinite(value) && Number.isFinite(maxValue) && maxValue > 0) {
          setCurrentValue(value)
          setPercentage((value / maxValue) * 100)
          return
        }
      }

      setCurrentValue(0)
      setPercentage(0)
    }
  })

  return (
    <BaseView body={
      <div className="h-full items-center overflow-hidden flex px-5 pt-5 pb-11 align-middle justify-center">
        <TooltipWrapper
          delayDuration={ 0 }
          side={ 'top' }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          content={
            <div className="font-medium">
              { `${ currentValue.toFixed(2) } / ${ targetMaxValue.toFixed(2) }` }
            </div>
          }
        >
          <div className="relative">
            <div className="max-h-[330px]">
              <ReactApexChart
                options={ options }
                series={ series }
                type="radialBar"
                height={ 330 }
              />
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="text-[30px] font-semibold text-[#1D2939] dark:text-white/90"
                style={ { transform: 'translateY(10px)' } }
              >
                { `${ percentage.toFixed(2) }%` }
              </span>
            </div>
          </div>
        </TooltipWrapper>
      </div>
    } configuration={
      <>
        { index?.current && (
          <TargetConfigurationPopover
            index={ index.current }
            currentEvent={ container.data.event }
            currentParameterKey={ container.data.parameterKey }
            currentMaxValue={ container.data.maxValue }
            onChange={ (event, parameterKey, maxValue) => {
              setContainer({...container, data: {event: event, parameterKey: parameterKey, maxValue: maxValue}})
            } }
          />
        ) }
      </>
    } container={ container }
    />
  )
}
