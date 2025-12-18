import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'

export interface EventConfigurationPopoverProps {
  index: EventTypeIndex
  currentValue: string
  onChange: (event: string) => void
}

export function EventConfigurationPopover({index, currentValue, onChange}: EventConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ event, setEvent ] = useState<string>(currentValue)

  return (
    <Popover modal open={ isOpen } onOpenChange={ setIsOpen }>
      <PopoverTrigger asChild>
        <div
          className={ 'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300  px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900' }>
          Configuration
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        onMouseDown={ (e) => {
          // e.preventDefault()
          e.stopPropagation()
        } }
      >
        <div className="grid gap-4 ">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Configuration</h4>
          </div>

          <div>
            <Select value={ event } onValueChange={ (value) => setEvent(value) }>
              <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select event"/>
              </SelectTrigger>
              <SelectContent className={ 'bg-white' }>
                { (index?.listTypes() ?? []).map((event, index) => (
                  <SelectItem key={ String(event) + index } value={ String(event) }>
                    { String(event) }
                  </SelectItem>
                )) }
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="default"
            onClick={ () => {
              onChange(event)
              setIsOpen(false)
            } }
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
