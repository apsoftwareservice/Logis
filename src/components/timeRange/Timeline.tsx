"use client"

import { useState } from 'react'
import TimelineSlider from '@/components/timeRange/TimelineSlider'
import { Clip, Marker } from '@/components/timeRange/TimeLine.types'
import { useDashboard } from '@/context/DashboardContext'
import { seekValueToEpochMs } from '@/parsers/utils'

export interface TimelineProps {

}

export function Timeline({  }: TimelineProps) {
  const [ time, setTime ] = useState<number>()
  const {setCurrentTimestamp, timeframe, clips, markers} = useDashboard()

  // const clips: Clip[] = [
    // { id: "A", start: 0, end: 22.5, track: 0, label: "Intro", color: "#fde68a" },
    // { id: "B", start: 10, end: 42, track: 1, label: "Interview", color: "#bbf7d0" },
    // { id: "C", start: 44, end: 70, track: 0, label: "B-Roll", color: "#bfdbfe" },
    // { id: "D", start: 80, end: 110, track: 1, label: "Overlay", color: "#fecaca" },
  // ]
  
  return (
    <div className="p-4 bg-gradient-to-t from-gray-800 to-gray-800/0">
      <TimelineSlider
        startDate={timeframe.start}
        endDate={timeframe.end ?? 100}
        currentTime={ time ?? timeframe.start }
        onSeek={ (value) => {
          setTime(value)
          const ms = seekValueToEpochMs(value, timeframe.start, timeframe.end)
          setCurrentTimestamp(Math.floor(ms))
        } }

        markers={ markers }
        clips={ clips }
        minWindowSec={ 0.5 }
        step={ 0.01 }
      />
    </div>
  )
}