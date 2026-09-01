import React from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { closeDashboardDropdowns } from '@/components/ui/dropdown/dropdownEvents'

interface ConfigurationPopoverProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  title?: string
  contentClassName?: string
  footerStart?: React.ReactNode
  children: React.ReactNode
  onApply: () => boolean | void
}

export default function ConfigurationPopover({
  isOpen,
  setIsOpen,
  title = 'Configuration',
  contentClassName = 'w-80',
  footerStart,
  children,
  onApply
}: ConfigurationPopoverProps) {
  const closeAll = () => {
    setIsOpen(false)
    closeDashboardDropdowns()
  }

  return (
    <Popover
      modal
      open={ isOpen }
      onOpenChange={ (open) => {
        setIsOpen(open)
      } }
    >
      <PopoverTrigger asChild>
        <div
          className={ 'flex w-full font-normal text-left rounded-lg dark:hover:bg-white/5 dark:hover:text-gray-300  px-4 py-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 hover:text-gray-900' }>
          Configuration
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={ 8 }
        collisionPadding={ 8 }
        className={ cn(
          'max-h-[min(85vh,var(--radix-popover-content-available-height))] max-w-[calc(100vw-1rem)] overflow-hidden p-0',
          contentClassName
        ) }
        data-dropdown-lock-outside
        onInteractOutside={ (e) => e.preventDefault() }
        onMouseDown={ (e) => {
          e.stopPropagation()
        } }
      >
        <div className="flex max-h-[min(85vh,var(--radix-popover-content-available-height))] min-h-0 flex-col">
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4">
            <div className="grid gap-4 pb-4">
              <div className="space-y-2">
                <h4 className="leading-none font-medium">{ title }</h4>
              </div>

              { children }
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button variant="destructive" onClick={ closeAll }>
                  Close
                </Button>
                { footerStart }
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={ () => {
                    if (onApply() === false) return

                    closeAll()
                  } }
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
