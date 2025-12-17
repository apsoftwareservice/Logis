"use client"

import React, { useEffect, useRef, useState } from "react"
import { ApexOptions } from "apexcharts"
import dynamic from "next/dynamic"
import { GraphConfigurationPopover } from '@/components/ui/popover/GraphConfigurationPopover'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/core/engine'
import { DashboardContainer, StatisticsModel } from '@/types/containers'
import { getNestedValue, parseNumeric } from '@/lib/utils'
import BaseView from '@/components/dashboard/BaseView'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'
import { randomUUID } from "@/lib/crypto-util"

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false
})

interface StatisticsData {
  name: string,
  data: any[]
}

/**
 * Describes the names of the properties inside each payload that should be used
 * for the X and Y axes when building chart data points.
 */
type AxisNames = { xAxisParameterName: string; yAxisParameterName: string }
/** A single ApexCharts-compatible data point. */
type ChartDataPoint = { x: any; y: number }

/**
 * Transform a raw list of event payloads into chart data points.
 *
 * - Reads values using the provided axis names (e.g., "timestamp", "amount").
 * - Validates that the X value exists.
 * - Normalizes Y into a number using `parseNumeric` (handles "$2,399.00", "(12)").
 * - Skips invalid entries.
 *
 * @param payloadList Array of raw payload objects coming from the event bucket.
 * @param axisNames   Property names to read for X and Y axes.
 * @returns           A dense array of `{ x, y }` points ready for ApexCharts.
 */
function extractDataPointsFromPayloads(payloadList: unknown[], axisNames: AxisNames): ChartDataPoint[] {
  const {xAxisParameterName, yAxisParameterName} = axisNames
  const result: ChartDataPoint[] = []

  for (let i = 0; i < payloadList.length; i++) {
    const payload = payloadList[i] as any
    const x = getNestedValue(payload, xAxisParameterName)
    if (x === undefined) continue

    const yRaw = getNestedValue(payload, yAxisParameterName)
    const y = parseNumeric(yRaw) // returns number | null
    if (typeof y !== 'number' || !Number.isFinite(y)) continue

    result.push({x, y})
  }

  return result
}

/**
 * Compute a lightweight signature for the current series to avoid redundant React state updates.
 * The signature encodes the Y axis name, data length, and the last point values.
 */
function computeSeriesSignature(yAxisName: string, dataPoints: ChartDataPoint[]): string {
  const lastPoint = dataPoints.length ? dataPoints[dataPoints.length - 1] : undefined
  return `${ yAxisName }|${ dataPoints.length }|${ lastPoint ? `${ lastPoint.x }:${ lastPoint.y }` : '' }`
}

/**
 * StatisticsChart
 *
 * Renders a line/area chart whose X and Y axes are dynamically selected
 * via the statistics configuration popover. Data is sourced from the dashboard
 * event index; on each `renderAt` tick, payloads are transformed into ApexCharts
 * points and the series is updated only when needed.
 */
export default function GraphView({container}: { container: DashboardContainer<StatisticsModel> }) {
  const {index, registerObserver, setContainer} = useDashboard()
  const [ series, setSeries ] = useState<StatisticsData[]>([])
  const [ isBarChart, setIsBarChart ] = useState<boolean>(false)

  /**
   * Tracks a short string signature of the last emitted series to prevent unnecessary `setSeries` calls.
   */
  const seriesSigRef = useRef<string>("")

  const eventSeriesRef = useRef<Record<string, StatisticsData[]>>({})

  useEffect(() => {
    if (!index?.current) return
    const seriesArr = (container.data.series ?? []) as Array<{ event: string }>
    const uniqueEvents = Array.from(new Set(seriesArr.map(s => s.event))).filter(Boolean) as string[]
    uniqueEvents.forEach(ev => registerObserver(eventObserver(ev, index.current!)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ container ])

  const areaOptions: ApexOptions = {
    legend: {
      show: false, // Hide legend
      position: "top",
      horizontalAlign: "left"
    },
    colors: [ "#465FFF", "#9CB9FF" ], // Define line colors
    chart: {
      fontFamily: "Outfit, sans-serif",
      // height: 310,
      type: "area", // Set the chart type to 'line'
      toolbar: {
        show: true // Hide chart toolbar
      }
    },
    stroke: {
      curve: "straight", // Define the line style (straight, smooth, or step)
      width: [ 2, 2 ] // Line width for each dataset
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0
      }
    },
    markers: {
      size: 0, // Size of the marker points
      strokeColors: "#fff", // Marker border color
      strokeWidth: 2,
      hover: {
        size: 6 // Marker size on hover
      }
    },
    grid: {
      xaxis: {
        lines: {
          show: false // Hide grid lines on x-axis
        }
      },
      yaxis: {
        lines: {
          show: true // Show grid lines on y-axis
        }
      }
    },
    dataLabels: {
      enabled: false // Disable data labels
    },
    tooltip: {
      enabled: true, // Enable tooltip
      x: {
        format: "dd MMM yyyy" // Format for x-axis tooltip
      }
    },
    xaxis: {
      type: "category", // Category-based x-axis
      categories: [],
      axisBorder: {
        show: false // Hide x-axis border
      },
      axisTicks: {
        show: false // Hide x-axis ticks
      },
      tooltip: {
        enabled: true // Disable tooltip for x-axis points
      }
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px", // Adjust font size for y-axis labels
          colors: [ "#6B7280" ] // Color of the labels
        }
      },
      title: {
        text: "", // Remove y-axis title
        style: {
          fontSize: "0px"
        }
      }
    }
  }

  const barOptions: ApexOptions = {
    colors: [ "#465fff", "#81d552" ],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 5,
        borderRadiusApplication: "end"
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      show: true,
      width: 4,
      colors: [ "transparent" ]
    },
    xaxis: {
      axisBorder: {
        show: true
      },
      axisTicks: {
        show: true
      }
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit"
    },
    yaxis: {
      title: {
        text: undefined
      }
    },
    grid: {
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    fill: {
      opacity: 1
    },

    tooltip: {
      x: {
        show: false
      },
      y: {
        formatter: (val: number) => `${ val }`
      }
    }
  }

  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      // Use the current configured series and keep only those for this event
      const configured = (container.data.series ?? []) as Array<{
        event: string;
        xAxisParameterName: string;
        yAxisParameterName: string;
      }>
      const perEventConfig = configured.filter(s => s.event === event)

      const bucket = index.getBucket(event)

      if (!bucket || perEventConfig.length === 0) {
        // If this event no longer has series, clear it from the map and update
        if (eventSeriesRef.current[event]) {
          delete eventSeriesRef.current[event]
          const merged = Object.values(eventSeriesRef.current).flat()
          const signature = merged
            .map(ds => computeSeriesSignature(ds.name, ds.data as any))
            .join('||')
          if (signature !== seriesSigRef.current) {
            seriesSigRef.current = signature
            setSeries(merged)
          }
        }
        return 0
      }

      const {payloads} =
      bucket.getEventsInExclusiveInclusiveRange(Number.NEGATIVE_INFINITY, timestampMs) ??
      {timestampsMs: new Float64Array(0), payloads: []}

      const perEventSeries: StatisticsData[] = []

      if (Array.isArray(payloads)) {
        for (const s of perEventConfig) {
          const dataPoints = extractDataPointsFromPayloads(payloads as unknown[], {
            xAxisParameterName: s.xAxisParameterName,
            yAxisParameterName: s.yAxisParameterName
          })
          perEventSeries.push({
            name: String(s.yAxisParameterName || s.event),
            data: dataPoints
          })
        }
      }

      // Save series computed for this event
      eventSeriesRef.current[event] = perEventSeries

      // Merge all events' series and update chart if changed
      const merged = Object.values(eventSeriesRef.current).flat()
      const signature = merged
        .map(ds => computeSeriesSignature(ds.name, ds.data as any))
        .join('||')

      if (signature !== seriesSigRef.current) {
        seriesSigRef.current = signature
        setSeries(merged)
      }

      return 0
    }
  })

  return (
    <BaseView body={
      <div className="max-w-full w-full h-auto custom-scrollbar overflow-hidden">
        <div className="min-h-0">
          <ReactApexChart
            key={ "area" }
            options={ {...areaOptions} }
            series={ series }
            type={ "area" }
          />
        </div>
      </div>
    } configuration={
      <>
        { index?.current && (
          <GraphConfigurationPopover
            index={ index.current }
            container={ container }
            onChange={ (seriesList) => {
              setContainer({ ...container, data: { series: seriesList } })
            } }/>
        ) }
        <DropdownItem
          onItemClick={ () => setIsBarChart(!isBarChart) }
          className="flex w-full font-normal text-left rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-red-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          Toggle View
        </DropdownItem>
      </>
    } container={ container }
    />
  )
}
