"use client"

import React, { useEffect, useRef, useState } from "react"
import { ApexOptions } from "apexcharts"
import dynamic from "next/dynamic"
import { GraphConfigurationPopover } from '@/components/ui/popover/GraphConfigurationPopover'
import { useDashboard } from '@/context/DashboardContext'
import { EventTypeIndex, Observer } from '@/parsers/engine'
import { DashboardContainer } from '@/types/containers'
import { StatisticsModel } from '@/types/statistics'
import { cn, parseNumeric } from '@/lib/utils'
import { Check } from 'lucide-react'

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

  for (let index = 0; index < payloadList.length; index++) {
    const payload = payloadList[index] as any
    const xValue = payload?.[xAxisParameterName]
    if (xValue === undefined) continue
    const yValue = parseNumeric(payload?.[yAxisParameterName])
    if (yValue === null) continue
    result.push({x: xValue, y: yValue})
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
  const {logIndex, registerObserver, onTitleChange, lockGrid} = useDashboard()
  const [ series, setSeries ] = useState<StatisticsData[]>([])
  const [ title, setTitle ] = useState(container.title ?? "Graph")

  useEffect(() => {
    if (title !== container.title) {
      setTitle(container.title)
    }
  }, [lockGrid])

  /**
   * Tracks a short string signature of the last emitted series to prevent unnecessary `setSeries` calls.
   */
  const seriesSigRef = useRef<string>("")

  /**
   * Holds the latest axis names across renders so callbacks (like `renderAt`) don’t capture stale values.
   */
  const axesRef = useRef({
    xAxisParameterName: container.data.xAxisParameterName,
    yAxisParameterName: container.data.yAxisParameterName
  })

  useEffect(() => {
    axesRef.current = {
      xAxisParameterName: container.data.xAxisParameterName,
      yAxisParameterName: container.data.yAxisParameterName
    }
  }, [ container ])

  const options: ApexOptions = {
    legend: {
      show: false, // Hide legend
      position: "top",
      horizontalAlign: "left"
    },
    colors: [ "#465FFF", "#9CB9FF" ], // Define line colors
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line", // Set the chart type to 'line'
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

  /**
   * Factory that creates an observer for a specific event type.
   * It reads the latest payloads up to `timestampMs`, converts them into chart points,
   * computes a signature, and updates the chart only when the data actually changes.
   */
  const eventObserver = (event: string, index: EventTypeIndex): Observer => ({
    id: crypto.randomUUID(),
    types: [ event ],
    renderAt: (timestampMs: number) => {
      const eventBucket = index.getBucket(event)

      if (!eventBucket) return 0

      const {timestampsMs, payloads} =
      eventBucket.getEventsInExclusiveInclusiveRange(Number.NEGATIVE_INFINITY, timestampMs) ??
      {timestampsMs: new Float64Array(0), payloads: []}

      if (payloads && Array.isArray(payloads)) {
        const axisNames: AxisNames = {
          xAxisParameterName: axesRef.current.xAxisParameterName,
          yAxisParameterName: axesRef.current.yAxisParameterName
        }

        const dataPoints = extractDataPointsFromPayloads(payloads as unknown[], axisNames)
        const signature = computeSeriesSignature(axisNames.yAxisParameterName, dataPoints)

        if (signature !== seriesSigRef.current) {
          seriesSigRef.current = signature
          setSeries([
            {
              name: String(axisNames.yAxisParameterName),
              data: dataPoints
            }
          ])
        }
      }
    }
  })

  return (
    <div
      className="h-full w-full overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
      <div className="flex flex-col gap-5 mb-4 sm:flex-row sm:justify-between">
        <div className={ 'flex gap-2 items-center align-middle' }>
          <input
            type="text"
            value={ title }
            onChange={ (e) => setTitle(e.target.value) }
            disabled={ lockGrid }
            className={ cn("text-lg font-semibold text-gray-800 dark:text-white/90 bg-transparent ", !lockGrid && "border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400") }
          />
          { !lockGrid && (
            <button onClick={ () => onTitleChange(container, title) }>
              <Check className={ 'text-green-600' }></Check>
            </button>
          ) }
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          { logIndex && (
            <GraphConfigurationPopover logIndex={ logIndex } container={ container } onChange={ (event) => {
              registerObserver(eventObserver(event, logIndex))
            } }/>
          ) }
        </div>
      </div>

      <div className="max-w-full w-full h-auto custom-scrollbar">
        <div className="min-h-0">
          <ReactApexChart
            options={ options }
            series={ series }
            type="area"
          />
        </div>
      </div>
    </div>
  )
}
