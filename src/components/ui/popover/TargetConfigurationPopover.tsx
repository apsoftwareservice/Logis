import React, { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { EventTypeIndex } from '@/core/engine'
import { toast } from 'react-toastify'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'
import { DEFAULT_TARGET_MAX_VALUE } from '@/types/containers'
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'
import EventSelect from '@/components/ui/popover/EventSelect'

export interface TargetConfigurationPopoverProps {
  index: EventTypeIndex
  currentEvent: string
  currentParameterKey: string
  currentMaxValue: number
  onChange: (event: string, parameterKey: string, maxValue: number) => void
}

export function TargetConfigurationPopover({ index, currentEvent, currentParameterKey, currentMaxValue, onChange }: TargetConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ options, setOptions ] = useState<NestedObject>()
  const [ event, setEvent ] = useState<string>(currentEvent)
  const [ value, setValue ] = useState<string>(currentParameterKey)
  const [ maxValue, setMaxValue ] = useState<number>(currentMaxValue || DEFAULT_TARGET_MAX_VALUE)

  useEffect(() => {
    if (isOpen) {
      setEvent(currentEvent)
      setValue(currentParameterKey)
      setMaxValue(currentMaxValue || DEFAULT_TARGET_MAX_VALUE)
    }
  }, [ currentEvent, currentMaxValue, currentParameterKey, isOpen ])

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
    <ConfigurationPopover
      isOpen={ isOpen }
      setIsOpen={ setIsOpen }
      onApply={ () => onChange(event, value, maxValue) }
    >
      <EventSelect index={ index } value={ event } onChange={ setEvent } isOpen={ isOpen } />

      { event && (
        <>
          <div className="grid gap-2">
            <Label>Value</Label>
            { options && (
              <NestedSelect
                data={ options }
                value={ value }
                onSelect={ (value) => {
                  setValue(value)
                } }
              />
            ) }
          </div>

          <div className="grid gap-2">
            <Label>Max Value</Label>
            <Input
              type="number"
              step="1"
              min={ 1 }
              value={ maxValue }
              placeholder={ String(DEFAULT_TARGET_MAX_VALUE) }
              onChange={ (e) => setMaxValue(Number(e.target.value) || DEFAULT_TARGET_MAX_VALUE) }
            />
          </div>
        </>
      ) }
    </ConfigurationPopover>
  )
}
