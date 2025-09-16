"use client"

import { useState } from 'react'
import TimelineSlider from '@/components/timeRange/TimelineSlider'
import { useDashboard } from '@/context/DashboardContext'
import { seekValueToEpochMs } from '@/lib/utils'

export function Timeline() {
  const [ time, setTime ] = useState<number>()
  const {setCurrentTimestamp, timeframe, clips, markers} = useDashboard()

  return (
    <div className="p-4 bg-gradient-to-t from-gray-800 to-gray-800/0">
      <TimelineSlider
        startDate={ timeframe.start }
        endDate={ timeframe.end ?? 1 }
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