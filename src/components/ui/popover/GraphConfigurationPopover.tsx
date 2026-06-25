import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { EventTypeIndex } from '@/core/engine'
import { Series } from '@/types/containers'
import NestedSelect, { NestedObject } from '@/components/ui/nestedSelect'
import ConfigurationPopover from '@/components/ui/popover/ConfigurationPopover'
import EventSelect from '@/components/ui/popover/EventSelect'

export interface GraphConfigurationPopoverProps {
  index: EventTypeIndex
  currentValue: Series[]
  onChange: (series: Series[]) => void
}

export function GraphConfigurationPopover({index, currentValue, onChange}: GraphConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)

  const [ seriesList, setSeriesList ] = useState<Series[]>(currentValue)

  useEffect(() => {
    if (isOpen) {
      setSeriesList(currentValue)
    }
  }, [ currentValue, isOpen ])

  return (
    <ConfigurationPopover
      isOpen={ isOpen }
      setIsOpen={ setIsOpen }
      contentClassName="w-[34rem]"
      onApply={ () => {
        if (!seriesList.length) return false

        onChange(seriesList)
      } }
      footerStart={
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
      }
    >
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
                <EventSelect
                  index={ index }
                  value={ s.event }
                  isOpen={ isOpen }
                  onChange={ (value) => setSeriesList(list => list.map(x => x.id === s.id ? ({
                    ...x,
                    event: value,
                    xAxisParameterName: '',
                    yAxisParameterName: ''
                  }) : x)) }
                />
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
    </ConfigurationPopover>
  )
}
