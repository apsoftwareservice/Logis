import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EventTypeIndex } from '@/parsers/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { Settings } from 'lucide-react'
import { DashboardContainer, StatisticsModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { toast } from 'react-toastify'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'

export interface GraphConfigurationPopoverProps {
  logIndex: EventTypeIndex
  container: DashboardContainer<StatisticsModel>
  onChange: (event: string, xAxis: string, yAxis: string) => void
}

export function GraphConfigurationPopover({logIndex, container, onChange}: GraphConfigurationPopoverProps) {
  const {setContainers} = useDashboard()
  const [ xAxisOptions, setXAxisOptions ] = useState<NestedObject>()
  const [ yAxisOptions, setYAxisOptions ] = useState<NestedObject>()
  const [ isOpen, setIsOpen ] = useState(false)

  const [ event, setEvent ] = useState<string>(container.event)
  const [ selectedXAxisParameterName, setSelectedXAxisParameterName ] = useState<string>(container.data.xAxisParameterName)
  const [ selectedYAxisParameterName, setSelectedYAxisParameterName ] = useState<string>(container.data.yAxisParameterName)

  useEffect(() => {
    const bucket = logIndex.getBucket(event)

    if (bucket) {
      const data = bucket?.first()

      if (data) {
        setXAxisOptions(data as NestedObject)
        setYAxisOptions(data as NestedObject)
      } else {
        toast.warning('Event has not data')
      }
    }
  }, [ logIndex, event ])

  return (
    <Popover modal open={ isOpen } onOpenChange={ setIsOpen }>
      <PopoverTrigger asChild>
        <Button variant="outline" className={ 'text-gray-800 dark:text-white/90' }>
          <Settings/>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        onMouseDown={ (e) => {
          e.preventDefault()
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
                { (logIndex?.listTypes() ?? []).map((event, index) => (
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
                <Label>X Axis</Label>
                { xAxisOptions && (
                  <NestedSelect data={ xAxisOptions } onSelect={ (value) => {
                    setSelectedXAxisParameterName(value)
                  } }/>
                ) }
              </div>

              <div className="grid gap-2">
                <Label>Y Axis</Label>
                { yAxisOptions && (
                  <NestedSelect data={ yAxisOptions } onSelect={ (value) => {
                    setSelectedYAxisParameterName(value)
                  } }/>
                ) }
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
                      xAxisParameterName: selectedXAxisParameterName,
                      yAxisParameterName: selectedYAxisParameterName
                    }
                  }
                }
                return _container
              }))

              onChange(event, selectedXAxisParameterName, selectedYAxisParameterName)
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
