import React, { useEffect, useState } from 'react'
import { EventTypeIndex } from '@/core/engine'
import { Label } from '@/components/ui/label'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'
import { toast } from 'react-toastify'
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'
import EventSelect from '@/components/ui/popover/EventSelect'

export interface EventParameterConfigurationPopoverProps {
  index: EventTypeIndex
  currentEvent: string
  currentParameterKey: string
  onChange: (event: string, parameterKey: string) => void
}

export function EventParameterConfigurationPopover({index, currentEvent, currentParameterKey, onChange}: EventParameterConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ event, setEvent ] = useState<string>(currentEvent)
  const [ value, setValue ] = useState<string>(currentParameterKey)
  const [ options, setOptions ] = useState<NestedObject>()

  useEffect(() => {
    if (isOpen) {
      setEvent(currentEvent)
      setValue(currentParameterKey)
    }
  }, [ currentEvent, currentParameterKey, isOpen ])

  useEffect(() => {
    const bucket = index.getBucket(event)

    if (bucket) {
      const data = bucket?.first()

      if (data) {
        setOptions(data as NestedObject)
      } else {
        toast.warning('Event has not data')
      }
    } else {
      setOptions(undefined)
    }
  }, [ index, event ])

  return (
    <ConfigurationPopover isOpen={ isOpen } setIsOpen={ setIsOpen } onApply={ () => onChange(event, value) }>
      <EventSelect index={ index } value={ event } onChange={ setEvent } isOpen={ isOpen } />

      { event && (
        <div className="grid gap-2">
          <Label>Value</Label>
          { options && (
            <NestedSelect value={value} data={ options } onSelect={ (value) => {
              setValue(value)
            } }/>
          ) }
        </div>
      ) }
    </ConfigurationPopover>
  )
}
