"use client"

import { useDashboard } from '@/context/DashboardContext'
import React, { ReactElement, useEffect, useReducer, useRef, useState } from 'react'
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
// over editable text (the title while actively being renamed, form fields) where
// the native browser menu - copy/paste/select-all - should stay available instead.
// The title is plain text (not an input) until clicked into edit mode, so it never
// matches this selector and opens the container menu like everything else.
const CONTEXT_MENU_IGNORE_SELECTOR = "input:read-write, textarea:read-write, select:not(:disabled), [contenteditable='true']"

export default function BaseView({body, className, configuration, container, menuItems}: BaseViewProps) {
  const {updateContainerTitle, removeContainer} = useDashboard()
  const [ isDropdownOpen, setIsDropdownOpen ] = useState<boolean>(false)
  const [ isEditingTitle, setIsEditingTitle ] = useState(false)
  const [ draftTitle, setDraftTitle ] = useState(container.title)
  const titleInputRef = useRef<HTMLInputElement>(null)
  // Enter/Escape close editing explicitly, but that also unmounts the input, which
  // fires a native blur right after - this flag stops that blur from re-running the
  // close logic a second time.
  const skipNextBlurRef = useRef(false)

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [ isEditingTitle ])

  const startEditingTitle = () => {
    setDraftTitle(container.title)
    setIsEditingTitle(true)
  }

  const closeEditingTitle = (commit: boolean) => {
    skipNextBlurRef.current = true
    if (commit) {
      const trimmed = draftTitle.trim()
      if (trimmed) updateContainerTitle(container, trimmed)
    }
    setIsEditingTitle(false)
  }

  const handleContainerContextMenu = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(CONTEXT_MENU_IGNORE_SELECTOR)) return
    event.preventDefault()
    event.stopPropagation()
    setIsDropdownOpen(true)
  }

  return (
    <div
      onContextMenu={ handleContainerContextMenu }
      className={ cn("w-full h-full flex flex-col gap-2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]", className) }>
      <div className="flex flex-col gap-3 items-center align-middle sm:flex-row sm:items-center sm:justify-between">
        <div className={ 'flex items-center gap-3 align-middle min-w-0' }>
          { isEditingTitle ? (
            <input
              ref={ titleInputRef }
              type="text"
              value={ draftTitle }
              onChange={ (e) => setDraftTitle(e.target.value) }
              onBlur={ () => {
                if (skipNextBlurRef.current) {
                  skipNextBlurRef.current = false
                  return
                }
                closeEditingTitle(true)
              } }
              onKeyDown={ (e) => {
                if (e.key === 'Enter') { e.preventDefault(); closeEditingTitle(true) }
                if (e.key === 'Escape') { e.preventDefault(); closeEditingTitle(false) }
              } }
              className="no-drag min-w-0 text-lg font-semibold text-gray-800 dark:text-white/90 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-green-500 dark:focus:border-green-400"
            />
          ) : (
            <span
              onClick={ startEditingTitle }
              title="Click to rename"
              className="no-drag min-w-0 truncate rounded px-0.5 -mx-0.5 text-lg font-semibold text-gray-800 cursor-text hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/5"
            >
              { container.title }
            </span>
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
