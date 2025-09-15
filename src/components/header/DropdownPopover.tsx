import { Dropdown } from '@/components/ui/dropdown/Dropdown'
import { DropdownItem } from '@/components/ui/dropdown/DropdownItem'
import { X } from 'lucide-react'
import React from 'react'
import { capitalize, cn } from '@/lib/utils'

export default function DropdownPopover({title, isOpen, setIsOpen, options = [], className, onOptionClick}: {
  title: string
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  options: string[];
  className?: string
  onOptionClick?: (option: string) => void
}) {

  function toggleDropdown() {
    setIsOpen(!isOpen)

  }

  function closeDropdown() {
    setIsOpen(false)
  }

  return (
    <Dropdown
      isOpen={ isOpen }
      onClose={ closeDropdown }
      className={ cn("absolute flex h-auto max-h-[500px] w-full flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:right-0", className) }
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
        <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          { title }
        </h5>
        <button
          onClick={ toggleDropdown }
          className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X/>
        </button>
      </div>
      <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
        { options && options.length > 0 ? (
          options.map((option, idx) => (
            <li key={ idx }>
              <DropdownItem
                onItemClick={ () => {
                  closeDropdown()
                  if (onOptionClick) onOptionClick(option)
                } }
                className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
              >
                    <span className="block">
                      <span className="mb-1.5 space-x-1 block text-theme-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-800 dark:text-white/90">{ capitalize(option) }</span>
                      </span>
                    </span>
              </DropdownItem>
            </li>
          ))
        ) : (
          <li className="px-4 py-2 text-sm text-gray-500">No options</li>
        ) }
      </ul>
    </Dropdown>
  )
}