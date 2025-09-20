"use client"

import { useDashboard } from '@/context/DashboardContext'
import React, { ReactElement, useEffect, useReducer, useState } from 'react'
import { cn } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'
import { DashboardContainer } from '@/types/containers'
import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'

export interface BaseViewProps {
  body: ReactElement
  configuration: ReactElement
  container: DashboardContainer<any>
}

export default function BaseView({body, configuration, container}: BaseViewProps) {
  const {updateContainerTitle, lockGrid, removeContainer} = useDashboard()
  const [ isDropdownOpen, setIsDropdownOpen ] = useState<boolean>(false)

  return (
    <div
      className="w-full h-full flex flex-col gap-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className={ 'flex items-center gap-3 align-middle min-w-0' }>
          <input
            type="text"
            value={ container.title }
            onChange={ (e) => {
              updateContainerTitle(container, e.target.value)
            } }
            disabled={ lockGrid }
            className={ cn("min-w-0 text-lg font-semibold text-gray-800 dark:text-white/90 bg-transparent ", !lockGrid && "border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-green-500 dark:focus:border-green-400") }
          />
        </div>

        <div className="">
          <button onClick={ () => setIsDropdownOpen(true) } className="dropdown-toggle">
            <MoreHorizontal className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"/>
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
