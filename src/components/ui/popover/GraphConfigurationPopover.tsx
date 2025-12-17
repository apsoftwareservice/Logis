import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { DashboardContainer, Series, StatisticsModel } from '@/types/containers'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'

export interface GraphConfigurationPopoverProps {
  index: EventTypeIndex
  container: DashboardContainer<StatisticsModel>
  onChange: (series: Series[]) => void
}

export function GraphConfigurationPopover({index, container, onChange}: GraphConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)

  const [ seriesList, setSeriesList ] = useState<Series[]>(container.data.series)

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
          e.preventDefault()
          e.stopPropagation()
        } }
      >
        <div className="grid gap-4 ">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Configuration</h4>
          </div>
          <div className="space-y-3">
            { seriesList?.map((s, i) => {
              const bucket = index.getBucket(s.event)
              const nested = bucket?.first() as NestedObject | undefined
              return (
                <div key={ s.id }
                     className="rounded-lg border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-700 px-3 py-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium underline underline-offset-3">Series { i + 1 }</h5>
                    { seriesList.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={ () => setSeriesList(list => list.filter(x => x.id !== s.id)) }
                      >
                        Remove
                      </Button>
                    ) }
                  </div>

                  <div className={ 'flex flex-col gap-2' }>
                    <Label>Event</Label>
                    <Select
                      value={ s.event }
                      onValueChange={ (value) => setSeriesList(list => list.map(x => x.id === s.id ? ({
                        ...x,
                        event: value,
                        xAxisParameterName: '',
                        yAxisParameterName: ''
                      }) : x)) }
                    >
                      <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900">
                        <SelectValue placeholder="Select event"/>
                      </SelectTrigger>
                      <SelectContent className={ 'bg-white' }>
                        { (index?.listTypes() ?? []).map((ev, idx) => (
                          <SelectItem key={ String(ev) + idx } value={ String(ev) }>
                            { String(ev) }
                          </SelectItem>
                        )) }
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>X Axis</Label>
                    { nested ? (
                      <NestedSelect
                        data={ nested }
                        value={ s.xAxisParameterName }
                        onSelect={ (value) => setSeriesList(list => list.map(x => x.id === s.id ? ({
                          ...x,
                          xAxisParameterName: value
                        }) : x)) }
                      />
                    ) : (
                      <div className="text-xs text-gray-400 py-2">No data for this event.</div>
                    ) }
                  </div>

                  <div className="grid gap-2">
                    <Label>Y Axis</Label>
                    { nested ? (
                      <NestedSelect
                        data={ nested }
                        value={ s.yAxisParameterName }
                        onSelect={ (value) => setSeriesList(list => list.map(x => x.id === s.id ? ({
                          ...x,
                          yAxisParameterName: value
                        }) : x)) }
                      />
                    ) : (
                      <div className="text-xs text-gray-400 py-2">No data for this event.</div>
                    ) }
                  </div>
                </div>
              )
            }) }
          </div>
        </div>
        <div className="flex items-center align-middle justify-between gap-2 pt-5">
          <Button
            className={ 'text-white bg-teal-700' }
            variant="secondary"
            onClick={ () => {
              setSeriesList(list => {
                const newSeries = {
                  id: `${ Date.now() }-${ Math.random() }`,
                  event: '',
                  xAxisParameterName: '',
                  yAxisParameterName: ''
                }
                return list ? list.concat(newSeries) : [ newSeries ]
              })
            } }
          >
            Add series
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className={ 'border' }
              onClick={ () => {
                if (!seriesList.length) return

                onChange(seriesList)

                setIsOpen(false)
              } }
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
