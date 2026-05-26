import React, { useState } from "react"
import { RotateCcw } from "lucide-react"
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'
import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'

export default function ResetLogs() {
  const { index, containers, sessionId, resetLogs, resetWorkspace } = useDashboard()
  const [ isDropdownOpen, setIsDropdownOpen ] = useState(false)

  const hasWorkspaceState = !!index?.current || containers.length > 0 || !!sessionId

  if (!hasWorkspaceState) {
    return null
  }

  return (
    <TooltipWrapper content={<div>Reset Options</div>} side={'bottom'}>
      <div className="relative">
        <button
          className={cn(
            "dropdown-toggle relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
            "hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400"
          )}
          onClick={() => setIsDropdownOpen(true)}
          aria-label="Open reset options"
        >
          <RotateCcw width={20} height={20} />
        </button>
        <Dropdown
          isOpen={ isDropdownOpen }
          onClose={ () => setIsDropdownOpen(false) }
          className="w-56 p-2"
        >
          <DropdownItem
            onItemClick={ () => {
              setIsDropdownOpen(false)
              if (window.confirm('Reset data? Containers and layout UI will stay intact.')) {
                resetLogs()
              }
            } }
            className="flex w-full font-normal text-left rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            Reset data
          </DropdownItem>
          <DropdownItem
            onItemClick={ () => {
              setIsDropdownOpen(false)
              if (window.confirm('Reset the full workspace? This will remove all your changes - data and UI layout')) {
                resetWorkspace()
              }
            } }
            className="flex w-full font-normal text-left text-red-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-red-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            Reset all
          </DropdownItem>
        </Dropdown>
      </div>
    </TooltipWrapper>
  )
}
