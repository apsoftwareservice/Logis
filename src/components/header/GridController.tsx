import React from "react"

import { Lock, LockOpen } from "lucide-react"
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'

export default function GridController() {
  const {lockGrid, setLockGrid} = useDashboard()

  return (
    <div className="relative">
      <button
        className={cn(
          "relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
          lockGrid ? "" : "bg-green-50 dark:bg-gray-800 border-green-800"
        )}
        onClick={ () => setLockGrid(!lockGrid) }
        aria-label="Upload file"
      >
        { lockGrid ? (<Lock width={ 20 } height={ 20 }/>) : (<LockOpen width={ 20 } height={ 20 }/>) }
      </button>
    </div>
  )
}