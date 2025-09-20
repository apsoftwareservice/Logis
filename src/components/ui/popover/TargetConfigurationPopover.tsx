import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { DashboardContainer, TargetModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { toast } from 'react-toastify'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'

export interface TargetConfigurationPopoverProps {
  index: EventTypeIndex
  container: DashboardContainer<TargetModel>
  onChange: (event: string) => void
}

export function TargetConfigurationPopover({index, container, onChange}: TargetConfigurationPopoverProps) {
  const {setContainers} = useDashboard()
  const [ isOpen, setIsOpen ] = useState(false)
  const [ options, setOptions ] = useState<NestedObject>()
  const [ event, setEvent ] = useState<string>(container.event)
  const [ value, setValue ] = useState<string>(container.data.value)
  const [ maxValue, setMaxValue ] = useState<number>(container.data.maxValue)

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

          { event && (
            <>
              <div className="grid gap-2">
                <Label>Value</Label>
                { options && (
                  <NestedSelect data={ options } onSelect={ (value) => {
                    setValue(value)
                  } }/>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Max Value</Label>
                  <Input
                    type="number"
                    step="1"
                    min={ 0 }
                    max={maxValue}
                    value={ maxValue ?? 100 }
                    placeholder="100"
                    onChange={ (e) => setMaxValue(Number(e.target.value)) }
                  />
              </div>
            </>
          ) }

        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="default"
            onClick={ () => {
              setContainers(containers => containers.map(_container => {
                if (_container.event === container.event) {
                  return {
                    ..._container,
                    event,
                    data: {
                      ..._container.data,
                      value,
                      maxValue
                    }
                  }
                }
                return _container
              }))

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
