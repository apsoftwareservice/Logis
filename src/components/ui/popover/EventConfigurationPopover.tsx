import React, { useState } from 'react'
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'

export interface EventConfigurationPopoverProps {
  index: EventTypeIndex
  currentValue: string
  onChange: (event: string) => void
}

export function EventConfigurationPopover({index, currentValue, onChange}: EventConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ event, setEvent ] = useState<string>(currentValue)

  return (
    <ConfigurationPopover isOpen={ isOpen } setIsOpen={ setIsOpen } onApply={ () => onChange(event) }>
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
    </ConfigurationPopover>
  )
}
