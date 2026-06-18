import React, { useEffect, useState } from 'react'
import { EventTypeIndex } from '@/core/engine'
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'
import EventSelect from '@/components/ui/popover/EventSelect'

export interface EventConfigurationPopoverProps {
  index: EventTypeIndex
  currentValue: string
  onChange: (event: string) => void
}

export function EventConfigurationPopover({index, currentValue, onChange}: EventConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ event, setEvent ] = useState<string>(currentValue)

  useEffect(() => {
    if (isOpen) {
      setEvent(currentValue)
    }
  }, [ currentValue, isOpen ])

  return (
    <ConfigurationPopover isOpen={ isOpen } setIsOpen={ setIsOpen } onApply={ () => onChange(event) }>
      <EventSelect index={ index } value={ event } onChange={ setEvent } isOpen={ isOpen } />
    </ConfigurationPopover>
  )
}
