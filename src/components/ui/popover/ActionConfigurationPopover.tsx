import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/dropdown/select'
import { ActionModel } from '@/types/containers'
import { Trash2, Plus } from 'lucide-react'

export interface ActionConfigurationPopoverProps {
  index?: any
  currentValue: ActionModel
  onChange: (config: ActionModel) => void
}

export function ActionConfigurationPopover({currentValue, onChange}: ActionConfigurationPopoverProps) {
  const [ isOpen, setIsOpen ] = useState(false)
  const [ method, setMethod ] = useState<string>(currentValue?.method || 'GET')
  const [ url, setUrl ] = useState<string>(currentValue?.url || '')
  const [ headers, setHeaders ] = useState<Array<{ key: string; value: string }>>(currentValue?.headers || [])
  const [ params, setParams ] = useState<Array<{ key: string; value: string }>>(currentValue?.params || [])
  const [ body, setBody ] = useState<string>(currentValue?.body || '')

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...headers]
    updated[index] = { ...updated[index], [field]: value }
    setHeaders(updated)
  }

  const addParam = () => {
    setParams([...params, { key: '', value: '' }])
  }

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index))
  }

  const updateParam = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...params]
    updated[index] = { ...updated[index], [field]: value }
    setParams(updated)
  }

  const handleApply = () => {
    onChange({
      method,
      url,
      headers: headers.filter(h => h.key.trim() !== ''),
      params: params.filter(p => p.key.trim() !== ''),
      body
    })
    setIsOpen(false)
  }

  return (
    <Popover modal open={ isOpen } onOpenChange={ setIsOpen }>
      <PopoverTrigger asChild>
        <div
          className={ 'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300  px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900' }>
          Configuration
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-[80vh] overflow-y-auto"
        onMouseDown={ (e) => {
          e.stopPropagation()
        } }
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">HTTP Request Configuration</h4>
          </div>

          <div className="grid gap-2">
            <Label>Method</Label>
            <Select value={ method } onValueChange={ (value) => setMethod(value) }>
              <SelectTrigger className="border rounded-md border-gray-600 text-sm bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select method"/>
              </SelectTrigger>
              <SelectContent className={ 'bg-white' }>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>URL</Label>
            <Input
              value={ url }
              onChange={ (e) => setUrl(e.target.value) }
              placeholder="https://api.example.com/endpoint"
              className="text-sm"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Headers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={ addHeader }
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              { headers.map((header, index) => (
                <div key={ index } className="flex gap-2 items-center">
                  <Input
                    value={ header.key }
                    onChange={ (e) => updateHeader(index, 'key', e.target.value) }
                    placeholder="Header name"
                    className="text-sm flex-1"
                  />
                  <Input
                    value={ header.value }
                    onChange={ (e) => updateHeader(index, 'value', e.target.value) }
                    placeholder="Header value"
                    className="text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={ () => removeHeader(index) }
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Query Parameters</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={ addParam }
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              { params.map((param, index) => (
                <div key={ index } className="flex gap-2 items-center">
                  <Input
                    value={ param.key }
                    onChange={ (e) => updateParam(index, 'key', e.target.value) }
                    placeholder="Parameter name"
                    className="text-sm flex-1"
                  />
                  <Input
                    value={ param.value }
                    onChange={ (e) => updateParam(index, 'value', e.target.value) }
                    placeholder="Parameter value"
                    className="text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={ () => removeParam(index) }
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          { (method === 'POST' || method === 'PUT' || method === 'PATCH') && (
            <div className="grid gap-2">
              <Label>Body</Label>
              <textarea
                value={ body }
                onChange={ (e) => setBody(e.target.value) }
                placeholder='{"key": "value"}'
                className="min-h-[100px] w-full rounded-md border border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            variant="default"
            onClick={ handleApply }
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
