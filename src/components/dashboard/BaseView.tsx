"use client"

import { useDashboard } from '@/context/DashboardContext'
import React, { ReactElement, useEffect, useReducer, useState } from 'react'
import { cn } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'
import { DashboardContainer } from '@/types/containers'
import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'
import { EventTypeIndex, Observer } from '@/core/engine'

export interface BaseViewProps {
  body: ReactElement
  className?: string
  configuration: ReactElement
  menuItems?: ReactElement[]
  container: DashboardContainer<any>
}

// Right-clicking a container is equivalent to clicking its three-dot menu, except
// over editable text (the title input while unlocked, form fields) where the
// native browser menu - copy/paste/select-all - should stay available instead.
// The title is plain text (not an input) while the grid is locked, so it never
// matches this selector and opens the container menu like everything else.
const CONTEXT_MENU_IGNORE_SELECTOR = "input:read-write, textarea:read-write, select:not(:disabled), [contenteditable='true']"

export default function BaseView({body, className, configuration, container, menuItems}: BaseViewProps) {
  const {updateContainerTitle, lockGrid, removeContainer} = useDashboard()
  const [ isDropdownOpen, setIsDropdownOpen ] = useState<boolean>(false)

  const handleContainerContextMenu = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(CONTEXT_MENU_IGNORE_SELECTOR)) return
    event.preventDefault()
    event.stopPropagation()
    setIsDropdownOpen(true)
  }

  return (
    <div
      onContextMenu={ handleContainerContextMenu }
      className={ cn("w-full h-full flex flex-col gap-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]", className) }>
      <div className="flex min-w-0 flex-col gap-2 items-center align-middle sm:flex-row sm:items-center sm:justify-between">
        <div className={ 'flex items-center gap-2 align-middle min-w-0' }>
          { lockGrid ? (
            <span title={ container.title } className="min-w-0 truncate text-lg font-semibold text-gray-800 dark:text-white/90">
              { container.title }
            </span>
          ) : (
            <input
              type="text"
              title={ container.title }
              value={ container.title }
              onChange={ (e) => {
                updateContainerTitle(container, e.target.value)
              } }
              className="min-w-0 truncate text-lg font-semibold text-gray-800 dark:text-white/90 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-green-500 dark:focus:border-green-400"
            />
          ) }
        </div>

        { menuItems && (
          <div className="flex items-center gap-2">
            { menuItems.map((item, index) => (
              <div key={ index }>
                { item }
              </div>
            )) }
          </div>
        )}

        <div className="">
          <button onClick={ () => setIsDropdownOpen(true) } className="dropdown-toggle">
            <MoreHorizontal width={ 18 } height={ 18 } className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"/>
          </button>
          <Dropdown
            isOpen={ isDropdownOpen }
            onClose={ () => setIsDropdownOpen(false) }
            className="w-40 p-2"
          >
            { configuration }
            <DropdownItem
              onItemClick={ () => removeContainer(container) }
              className="flex w-full font-normal text-left text-red-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-red-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Delete
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
      <div className="max-w-full w-full h-full overflow-auto">
        { body }
      </div>
    </div>
  )
}
