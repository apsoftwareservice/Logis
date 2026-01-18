import React from "react"
import { RotateCcw } from "lucide-react"
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'

export default function ResetLogs() {
  const { index, resetLogs } = useDashboard()

  if (!index?.current) {
    return null
  }

  return (
    <TooltipWrapper content={<div>Reset Logs</div>} side={'bottom'}>
      <button
        className={cn(
          "relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
          "hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400"
        )}
        onClick={() => {
          if (window.confirm('Are you sure you want to reset all logs? This will clear all log data but keep your containers.')) {
            resetLogs()
          }
        }}
        aria-label="Reset logs"
      >
        <RotateCcw width={20} height={20} />
      </button>
    </TooltipWrapper>
  )
}
