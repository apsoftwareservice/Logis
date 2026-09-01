import React, { useState } from "react"

import { SquarePlus } from "lucide-react"
import DropdownPopover from '@/components/header/DropdownPopover'
import { ContainerType, DefaultContainerData, DefaultContainerSize, getContainerTypeDescription, getContainerTypeLabel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { randomUUID } from "@/lib/crypto-util"

export default function AddContainer() {
  const {setContainers} = useDashboard()
  const [ isOpen, setIsOpen ] = useState(false)

  const options = Object.keys(ContainerType)

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center transition-colors bg-brand-blue-light border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-brand-blue-dark dark:hover:bg-blue-800 text-white dark:hover:text-white"
        onClick={ () => setIsOpen(!isOpen) }
        aria-label="Upload file"
      >
        <SquarePlus width={20} height={20}/>
      </button>
      <DropdownPopover title={ 'Add Container' } isOpen={ isOpen } setIsOpen={ setIsOpen } options={ options }
                       getOptionLabel={ (option) => getContainerTypeLabel(option as ContainerType) }
                       getOptionDescription={ (option) => getContainerTypeDescription(option as ContainerType) }
                       className={ 'w-52' } onOptionClick={ (value) => {
        const type = value as ContainerType
        setContainers(containers => containers.concat({
          id: randomUUID(),
          title: getContainerTypeLabel(value as ContainerType),
          type,
          gridLayout: DefaultContainerSize(type),
          data: DefaultContainerData(type)
        }))
      } }/>
    </div>
  )
}
