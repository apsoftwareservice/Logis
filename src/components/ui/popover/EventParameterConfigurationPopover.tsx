import React, { useEffect, useState } from 'react'
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { Label } from '@/components/ui/label'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'
import { toast } from 'react-toastify'
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'

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
    const bucket = index.getBucket(event)

    if (bucket) {
      const data = bucket?.first()

      if (data) {
        setOptions(data as NestedObject)
      } else {
        toast.warning('Event has not data')
      }
    }
  }, [ index, event ])

  return (
    <ConfigurationPopover isOpen={ isOpen } setIsOpen={ setIsOpen } onApply={ () => onChange(event, value) }>
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
