import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EventTypeIndex } from '@/core/engine'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { Settings } from 'lucide-react'
import { DashboardContainer, TableModel } from '@/types/containers'
import { useDashboard } from '@/context/DashboardContext'
import { toast } from 'react-toastify'
import NestedSelect, { NestedObject } from '../nestedSelect'
import Badge from '@/components/ui/badge/Badge'

export interface TableConfigurationPopoverProps {
  index: EventTypeIndex
  container: DashboardContainer<TableModel>
  onChange: (event: string, selectedColumns: string[]) => void
}

export function TableConfigurationPopover({index, container, onChange}: TableConfigurationPopoverProps) {
  const {setContainers} = useDashboard()
  const [ isOpen, setIsOpen ] = useState(false)

  const [ event, setEvent ] = useState<string>(container.event)
  const [ columnOptions, setColumnOptions ] = useState<NestedObject>()
  const [ selectedColumns, setSelectedColumns ] = useState<string[]>(container.data.columns ?? [])
  const [ dragIndex, setDragIndex ] = useState<number | null>(null)

  useEffect(() => {
    const bucket = index.getBucket(event)

    if (bucket) {
      const data = bucket?.first()

      if (data) {
        setColumnOptions(data as NestedObject)
      } else {
        toast.warning('Event has not data')
      }
    }
  }, [ index, event ])

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
          const target = e.target as HTMLElement
          // If the mousedown originates from a draggable chip (or its children), allow default so drag can start
          if (target?.getAttribute('draggable') === 'true' || target?.closest('[data-draggable-chip="true"]')) {
            return
          }
          e.preventDefault()
          e.stopPropagation()
        } }
      >
        <div className="grid gap-4 ">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Configuration</h4>
          </div>

          <div>
            <Select value={ event }
                    onValueChange={ (value) => setEvent(value) }
            >
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

          {/* Columns selector (add multiple) */ }
          <div className="grid gap-2">
            <Label>Columns</Label>

            {/* Selected columns preview */ }
            <div
              className="flex flex-wrap gap-2"
              onDragOver={ (e) => {
                // Allow dropping anywhere in the chip area
                e.preventDefault()
              } }
            >
              { (selectedColumns ?? []).map((col, i) => (
                <span
                  key={ col }
                  draggable
                  data-draggable-chip
                  onDragStart={ (e) => {
                    setDragIndex(i)
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(i))
                    }
                  } }
                  onDragOver={ (e) => {
                    e.preventDefault()
                    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
                  } }
                  onDrop={ (e) => {
                    e.preventDefault()
                    const fromIdxStr = e.dataTransfer?.getData('text/plain')
                    const fromIdx = fromIdxStr ? parseInt(fromIdxStr, 10) : dragIndex
                    if (fromIdx === null || fromIdx === undefined || fromIdx === i) return
                    setSelectedColumns((prev) => {
                      const next = [ ...(prev ?? []) ]
                      const [ moved ] = next.splice(fromIdx as number, 1)
                      next.splice(i, 0, moved)
                      return next
                    })
                    setDragIndex(null)
                  } }
                  onDragEnd={ () => setDragIndex(null) }
                  aria-selected={ dragIndex === i }
                  role="option"
                  className={ `py-1 text-xs cursor-move select-none ${
                    dragIndex === i ? 'opacity-60' : ''
                  }` }
                  title="Drag to reorder"
                >
                       <Badge size="sm" color={ "primary" }>
                  { col }
                       </Badge>
                </span>
              )) }

              { (!selectedColumns || selectedColumns.length === 0) && (
                <span className="text-xs text-gray-500">No columns selected</span>
              ) }
            </div>

            <div className="flex flex-col items-center gap-2">
              { columnOptions && (
                <NestedSelect data={ columnOptions } onSelect={ (value) => {
                  setSelectedColumns((prev) => (prev?.includes(value) ? prev : [ ...(prev ?? []), value ]))
                } }/>
              ) }
            </div>
          </div>
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
                      columns: selectedColumns
                    }
                  }
                }
                return _container
              }))

              onChange(event, selectedColumns)
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
