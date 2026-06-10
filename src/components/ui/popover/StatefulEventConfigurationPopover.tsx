import React, { useEffect, useState } from 'react'
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { Label } from "@/components/ui/label";
import NestedSelect, { NestedObject } from "@/components/ui/nestedSelect";
import { toast } from "react-toastify";
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'

export interface StatefulEventConfigurationPopoverProps {
  index: EventTypeIndex
  currentStartEvent: string
  currentStopEvent: string
  currentParameterKey: string
  onChange: (startEvent: string, stopEvent: string, parameterKey: string) => void
}

export function StatefulEventConfigurationPopover({index, currentStartEvent, currentStopEvent, currentParameterKey, onChange}: StatefulEventConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ startEvent, setStartEvent ] = useState<string>(currentStartEvent)
  const [ stopEvent, setStopEvent ] = useState<string>(currentStopEvent)
  const [ parameterKey, setParameterKey ] = useState<string>(currentParameterKey)
  const [ options, setOptions ] = useState<NestedObject>()

  useEffect(() => {
    const bucket = index.getBucket(startEvent)

    if (bucket) {
      const data = bucket?.first()

      if (data) {
        setOptions(data as NestedObject)
      } else {
        toast.warning('Event has no data')
      }
    }
  }, [ index, startEvent ])

  return (
    <ConfigurationPopover
      isOpen={ isOpen }
      setIsOpen={ setIsOpen }
      onApply={ () => onChange(startEvent, stopEvent, parameterKey) }
    >
      <Select value={ startEvent } onValueChange={ (value) => setStartEvent(value) }>
        <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900">
          <SelectValue placeholder="Select start event"/>
        </SelectTrigger>
        <SelectContent className={ 'bg-white' }>
          { (index?.listTypes() ?? []).map((event, index) => (
            <SelectItem key={ String(event) + index } value={ String(event) }>
              { String(event) }
            </SelectItem>
          )) }
        </SelectContent>
      </Select>

      <div>
        <Select value={ stopEvent } onValueChange={ (value) => setStopEvent(value) }>
          <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900">
            <SelectValue placeholder="Select stop event"/>
          </SelectTrigger>
          <SelectContent className={ 'bg-white' }>
            { (index?.listTypes() ?? []).map((event, index) => (
                <SelectItem key={ String(event) + index } value={ String(event) }>
                  { String(event) }
                </SelectItem>
            )) }
          </SelectContent>
        </Select>
        { startEvent && (
          <div className="grid gap-2 pt-2">
            <Label className="text-gray-500">Value (optional)</Label>
            { options && (
              <NestedSelect value={parameterKey} data={ options } onSelect={ (value) => {
                setParameterKey(value)
              } }/>
            ) }
          </div>
        ) }
      </div>
    </ConfigurationPopover>
  )
}
