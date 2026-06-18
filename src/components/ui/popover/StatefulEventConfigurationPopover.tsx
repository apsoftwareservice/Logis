import React, { useEffect, useState } from 'react'
import { EventTypeIndex } from '@/core/engine'
import { Label } from "@/components/ui/label";
import NestedSelect, { NestedObject } from "@/components/ui/nestedSelect";
import { toast } from "react-toastify";
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'
import EventSelect from '@/components/ui/popover/EventSelect'

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
    if (isOpen) {
      setStartEvent(currentStartEvent)
      setStopEvent(currentStopEvent)
      setParameterKey(currentParameterKey)
    }
  }, [ currentParameterKey, currentStartEvent, currentStopEvent, isOpen ])

  useEffect(() => {
    const bucket = index.getBucket(startEvent)

    if (bucket) {
      const data = bucket?.first()

      if (data) {
        setOptions(data as NestedObject)
      } else {
        toast.warning('Event has no data')
      }
    } else {
      setOptions(undefined)
    }
  }, [ index, startEvent ])

  const applySelection = (nextStartEvent: string, nextStopEvent: string, nextParameterKey: string) => {
    onChange(nextStartEvent, nextStopEvent, nextParameterKey)
    setIsOpen(false)
  }

  return (
    <ConfigurationPopover
      isOpen={ isOpen }
      setIsOpen={ setIsOpen }
      contentClassName="w-[26rem]"
      onApply={ () => onChange(startEvent, stopEvent, parameterKey) }
    >
      <EventSelect
        index={ index }
        value={ startEvent }
        onChange={ setStartEvent }
        onDoubleClick={ (event) => {
          if (stopEvent) {
            applySelection(event, stopEvent, parameterKey)
          }
        } }
        isOpen={ isOpen }
        placeholder="Search start events"
        listClassName="h-36"
      />

      <div>
        <EventSelect
          index={ index }
          value={ stopEvent }
          onChange={ setStopEvent }
          onDoubleClick={ (event) => {
            if (startEvent) {
              applySelection(startEvent, event, parameterKey)
            }
          } }
          isOpen={ isOpen }
          placeholder="Search stop events"
          listClassName="h-36"
        />
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
