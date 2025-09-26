import React, { useEffect, useRef, useState } from "react"

import { Search as SearchIcon } from "lucide-react"
import MultipleSelector, { Option } from '@/components/ui/multiple-selector'
import { useDashboard } from '@/context/DashboardContext'

export const colors = [
  "#c4123f", "#2d8a2d", "#d4b30f", "#3549a8", "#c46623",
  "#701a8f", "#2fb9b9", "#b026b9", "#94d00a", "#d19a9a",
  "#006666", "#b391cc", "#744b1c", "#d6d0a8", "#660000",
  "#80cc99", "#666600", "#d1a481", "#00005a", "#606060",
  "#7a7a7a", "#cc3700", "#236b47", "#355a7c", "#5041a0"
]

export default function Search({options = []}: {
  options?: string[];
}) {

  const {searchValues, setSearchValues} = useDashboard()
  const inputRef = useRef<HTMLInputElement>(null)
  const [ isOpen, setIsOpen ] = useState(false)

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
      <div className="relative px-5">
        <div className="relative" onClick={ () => setIsOpen(!isOpen) }>
                <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                 <SearchIcon className={ 'text-black dark:text-white' }/>
                </span>
          {/*<input*/ }
          {/*  ref={ inputRef }*/ }
          {/*  type="text"*/ }
          {/*  placeholder="Search or select logs..."*/ }
          {/*  value={ search }*/ }
          {/*  onChange={ handleSearchChange }*/ }
          {/*  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"*/ }
          {/*/>*/ }

          <MultipleSelector
            className={ 'dark:bg-dark-900 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800' }
            value={ searchValues }
            badgeClassName={ 'text-white' }
            options={ options.map((option, index) => {
              return {
                value: option,
                label: option,
                color: colors[index]
              } as Option
            }) }
            placeholder={'Search or select logs...'}
            onChange={ setSearchValues }
          />

          <button
            className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            <span> ⌘ </span>
            <span> K </span>
          </button>
        </div>
      </div>
    </form>
  )
}