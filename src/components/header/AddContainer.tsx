import React, { useState } from "react"

import { SquarePlus } from "lucide-react"
import DropdownPopover from '@/components/header/DropdownPopover'
import { ContainerType, DefaultContainerSize } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { capitalize } from '@/lib/utils'

export default function AddContainer() {
  const {setContainers} = useDashboard()
  const [ isOpen, setIsOpen ] = useState(false)

  const options = Object.keys(ContainerType)

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center transition-colors bg-brand-blue-light border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-brand-blue-dark text-white dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={ () => setIsOpen(!isOpen) }
        aria-label="Upload file"
      >
        <SquarePlus width={20} height={20}/>
      </button>
      <DropdownPopover title={ 'Add Container' } isOpen={ isOpen } setIsOpen={ setIsOpen } options={ options }
                       className={ 'w-52' } onOptionClick={ (value) => {
        setContainers(containers => containers.concat({
          id: crypto.randomUUID(),
          title: capitalize(value),
          type: value as ContainerType,
          gridLayout: DefaultContainerSize(value as ContainerType),
          event: '',
          data: {}
        }))
      } }/>
    </div>
  )
}