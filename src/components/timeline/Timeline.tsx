"use client"

import TimelineSlider from '@/components/timeline/TimelineSlider'
import { useDashboard } from '@/context/DashboardContext'
import { seekValueToEpochMs } from '@/lib/utils'

export function Timeline() {
  const {setCurrentTimestamp, timeframe, clips, markers, currentTimestamp, setFollowLogs} = useDashboard()

  return (
    <div className="p-4 bg-gradient-to-t from-gray-800 to-gray-800/0">
      { timeframe && (
        <TimelineSlider
          startDate={ timeframe.start ?? 0 }
          endDate={ timeframe.end ?? 1 }
          currentTime={ currentTimestamp ?? timeframe.start }
          onSeek={ (value) => {
            if (value === currentTimestamp || !timeframe.start || !timeframe.end) return
            const ms = seekValueToEpochMs(value, timeframe.start, timeframe.end)
            setFollowLogs(false)
            setCurrentTimestamp(Math.floor(ms))
          } }
          markers={ markers }
          clips={ clips }
          minWindowSec={ 0.5 }
          step={ 0.01 }
        />
      ) }
    </div>
  )
}