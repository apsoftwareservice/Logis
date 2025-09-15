import React, { useState } from "react"

import { Lock, LockOpen, SquarePlus } from "lucide-react"
import DropdownPopover from '@/components/header/DropdownPopover'
import { ContainerType } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'

export default function GridController() {
  const {lockGrid, setLockGrid} = useDashboard()

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={ () => setLockGrid(!lockGrid) }
        aria-label="Upload file"
      >
        { lockGrid ? (<Lock width={20} height={20}/>) : (<LockOpen width={20} height={20}/>)}
      </button>
    </div>
  )
}