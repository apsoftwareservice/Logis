import React, { useEffect, useRef, useState } from "react"

import { Search as SearchIcon } from "lucide-react"
import DropdownPopover from '@/components/header/DropdownPopover'
import { toast } from 'react-toastify'

export default function Search({onSearch, debounceMs = 2000, options = [], onOptionClick}: {
  onSearch?: (query: string) => void;
  debounceMs?: number;
  options?: string[];
  onOptionClick?: (option: string) => void
}) {

  const inputRef = useRef<HTMLInputElement>(null)
  const [ isOpen, setIsOpen ] = useState(false)
  const [ search, setSearch ] = useState<string>("")
  const searchTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearch(value)

    if (!onSearch) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      try {
        onSearch(value)
      } catch (err) {
        toast.error(`Search onSearch threw: ${err}`)
      }
    }, debounceMs)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <form>
      <div className="relative">
        <div className="relative" onClick={ () => setIsOpen(!isOpen) }>
                <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                 <SearchIcon className={ 'text-black dark:text-white' }/>
                </span>
          <input
            ref={ inputRef }
            type="text"
            placeholder="Search or select logs..."
            value={ search }
            onChange={ handleSearchChange }
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
          />
          <button
            className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            <span> ⌘ </span>
            <span> K </span>
          </button>
        </div>
        <DropdownPopover title={'Events'} isOpen={ isOpen } setIsOpen={ setIsOpen } options={ options } onOptionClick={ onOptionClick }/>
      </div>
    </form>
  )
}