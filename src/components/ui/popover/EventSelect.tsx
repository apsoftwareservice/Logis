import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownAZ, ArrowUpAZ, Check, List, Search } from 'lucide-react'
import { EventTypeIndex } from '@/core/engine'
import { cn } from '@/lib/utils'

type SortMode = 'arrival' | 'asc' | 'desc'

export interface EventSelectProps {
  index: EventTypeIndex
  value: string
  onChange: (event: string) => void
  onDoubleClick?: (event: string) => void
  isOpen?: boolean
  placeholder?: string
  listClassName?: string
}

function getSortedEvents(index: EventTypeIndex, sortMode: SortMode) {
  const events = index.listTypes().map(String)

  if (sortMode === 'asc') {
    return events.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  }

  if (sortMode === 'desc') {
    return events.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
  }

  return events
}

function getNextSortMode(sortMode: SortMode): SortMode {
  if (sortMode === 'arrival') return 'asc'
  if (sortMode === 'asc') return 'desc'
  return 'arrival'
}

function getSortMeta(sortMode: SortMode) {
  if (sortMode === 'asc') {
    return {
      icon: ArrowDownAZ,
      label: 'A-Z'
    }
  }

  if (sortMode === 'desc') {
    return {
      icon: ArrowUpAZ,
      label: 'Z-A'
    }
  }

  return {
    icon: List,
    label: 'Order'
  }
}

export default function EventSelect({
  index,
  value,
  onChange,
  onDoubleClick,
  isOpen,
  placeholder = 'Search events',
  listClassName
}: EventSelectProps) {
  const [ search, setSearch ] = useState('')
  const [ sortMode, setSortMode ] = useState<SortMode>('arrival')
  const [ highlightedIndex, setHighlightedIndex ] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedValue = value ?? ''

  useEffect(() => {
    if (isOpen) {
      setSearch(selectedValue)
      setSortMode('arrival')
    }
  }, [ isOpen, selectedValue ])

  const eventCount = index.listTypes().length
  const normalizedSearch = search.trim().toLowerCase()
  const normalizedValue = selectedValue.trim().toLowerCase()
  const activeSearch = normalizedSearch === normalizedValue ? '' : normalizedSearch

  const events = useMemo(() => {
    const sortedEvents = getSortedEvents(index, sortMode)

    if (!activeSearch) {
      return sortedEvents
    }

    return sortedEvents.filter(event => event.toLowerCase().includes(activeSearch))
  }, [ activeSearch, index, sortMode ])

  useEffect(() => {
    if (!events.length) {
      setHighlightedIndex(0)
      return
    }

    const selectedIndex = events.findIndex(event => event === selectedValue)
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [ events, selectedValue ])

  useEffect(() => {
    const activeItem = itemRefs.current[highlightedIndex]
    activeItem?.scrollIntoView({ block: 'nearest' })
  }, [ highlightedIndex ])

  const sortMeta = getSortMeta(sortMode)
  const SortIcon = sortMeta.icon
  const isFiltering = Boolean(activeSearch)

  const commitEvent = (event: string) => {
    onChange(event)
    setSearch(event)
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!events.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((currentIndex) => (currentIndex + 1) % events.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((currentIndex) => (currentIndex - 1 + events.length) % events.length)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      commitEvent(events[highlightedIndex])
    }
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900">
          <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
          <input
            value={ search }
            onChange={ (e) => setSearch(e.target.value) }
            onKeyDown={ handleKeyDown }
            placeholder={ placeholder }
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="event-select-listbox"
            aria-activedescendant={ events[highlightedIndex] ? `event-select-option-${ events[highlightedIndex] }` : undefined }
          />
          { isFiltering && (
            <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              { events.length }/{ eventCount }
            </span>
          ) }
        </div>
        <button
          type="button"
          onClick={ () => setSortMode((currentMode) => getNextSortMode(currentMode)) }
          className="inline-flex shrink-0 items-center rounded-md p-1.5 text-xs transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-gray-200"
          title="Cycle sort order"
          aria-label={ `Sort events: ${ sortMeta.label }` }
        >
          <SortIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        id="event-select-listbox"
        role="listbox"
        className={ cn('custom-scrollbar h-[11.25rem] overflow-y-auto rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900', listClassName) }
      >
        { events.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400">No events</div>
        ) : (
          events.map((event, index) => (
            <button
              key={ event }
              id={ `event-select-option-${ event }` }
              type="button"
              ref={ (element) => {
                itemRefs.current[index] = element
              } }
              role="option"
              aria-selected={ event === selectedValue }
              onClick={ () => commitEvent(event) }
              onDoubleClick={ () => {
                commitEvent(event)
                onDoubleClick?.(event)
              } }
              onMouseEnter={ () => setHighlightedIndex(index) }
              className={ cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/5',
                index === highlightedIndex && event !== value && 'bg-gray-100 dark:bg-white/5',
                event === selectedValue && 'bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/15'
              ) }
              title={ event }
            >
              <span className="truncate">{ event }</span>
              { event === selectedValue ? <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" /> : null }
            </button>
          ))
        ) }
      </div>
    </div>
  )
}
