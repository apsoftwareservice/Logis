import React, { useEffect, useState } from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { toast } from 'react-toastify'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'
import { DEFAULT_TARGET_MAX_VALUE } from '@/types/containers'
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'

export interface TargetConfigurationPopoverProps {
  index: EventTypeIndex
  currentEvent: string
  currentParameterKey: string
  currentMaxValue: number
  onChange: (event: string, parameterKey: string, maxValue: number) => void
}

export function TargetConfigurationPopover({index, currentEvent, currentParameterKey, currentMaxValue, onChange}: TargetConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ options, setOptions ] = useState<NestedObject>()
  const [ event, setEvent ] = useState<string>(currentEvent)
  const [ value, setValue ] = useState<string>(currentParameterKey)
  const [ maxValue, setMaxValue ] = useState<number>(currentMaxValue || DEFAULT_TARGET_MAX_VALUE)

  useEffect(() => {
    setEvent(currentEvent)
  }, [ currentEvent ])

  useEffect(() => {
    setValue(currentParameterKey)
  }, [ currentParameterKey ])

  useEffect(() => {
    setMaxValue(currentMaxValue || DEFAULT_TARGET_MAX_VALUE)
  }, [ currentMaxValue ])

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
    <ConfigurationPopover
      isOpen={ isOpen }
      setIsOpen={ setIsOpen }
      onApply={ () => onChange(event, value, maxValue) }
    >
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
        <>
          <div className="grid gap-2">
            <Label>Value</Label>
            { options && (
              <NestedSelect data={ options } value={ value } onSelect={ (value) => {
                setValue(value)
              } }/>
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
