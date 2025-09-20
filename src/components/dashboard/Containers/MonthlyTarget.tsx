"use client"
import { ApexOptions } from "apexcharts"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import BaseView from '@/components/dashboard/BaseView'
import { DashboardContainer, TargetModel } from '@/types/containers'
import { TargetConfigurationPopover } from '@/components/ui/popover/TargetConfigurationPopover'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import { getNestedValue } from '@/lib/utils'
// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false
})

export default function MonthlyTarget({container}: { container: DashboardContainer<TargetModel> }) {
  const {index, registerObserver} = useDashboard()
  const [ series, setSeries ] = useState([ 0 ])
  const options: ApexOptions = {
    colors: [ "#465FFF" ],
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
          margin: 5 // margin is in pixels
        },
        dataLabels: {
          name: {
            show: false
          },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: "#1D2939",
            formatter: function (val) {
              const num = typeof val === 'number' ? val : parseFloat(String(val))
              if (isNaN(num)) return '0%'
              return `${ num.toFixed(2) }%`
            }
          }
        }
      }
    },
    fill: {
      type: "solid",
      colors: [ "#465FFF" ]
    },
    stroke: {
      lineCap: "round"
    },
    labels: [ 'Progress' ]
  }

  const valueRef = useRef({
    value: container.data.value,
    maxValue: container.data.maxValue
  })

  useEffect(() => {
    valueRef.current = {
      value: container.data.value,
      maxValue: container.data.maxValue
    }
  }, [ container ])

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: crypto.randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const {timestampMs: _, data} = eventBucket.getLastEventAtOrBefore(timestampMs) ??
      {timestampMs: new Float64Array(0), data: []}

      if (data && valueRef.current.value) {
        const value = getNestedValue(data as any, valueRef.current.value)
        if (value) {
          setSeries([ (value / container.data.maxValue) * 100 ])
        } else {
          setSeries([0])
        }
      } else {
        setSeries([0])
      }
    }
  })

  return (
    <BaseView body={
      <div className="h-full items-center flex px-5 pt-5 pb-11 align-middle justify-center">
        <div className="relative ">
          <div className="max-h-[330px]">
            <ReactApexChart
              options={ options }
              series={ series }
              type="radialBar"
              height={ 330 }
            />
          </div>
        </div>
      </div>
    } configuration={
      <>
        { index?.current && (
          <TargetConfigurationPopover
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
