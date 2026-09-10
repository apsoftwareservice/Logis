import React, { useState } from "react"

import { SquarePlus } from "lucide-react"
import DropdownPopover from '@/components/header/DropdownPopover'
import { useAddContainer } from '@/hooks/useAddContainer'

export default function AddContainer() {
  const [ isOpen, setIsOpen ] = useState(false)
  const { options, addContainer, getOptionLabel, getOptionDescription } = useAddContainer()

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
                       getOptionLabel={ getOptionLabel }
                       getOptionDescription={ getOptionDescription }
                       className={ 'w-52' } onOptionClick={ addContainer }/>
    </div>
  )
}
