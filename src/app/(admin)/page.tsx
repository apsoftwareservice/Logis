"use client"

import React, { useState } from "react"
import TableView from "@/components/dashboard/Containers/TableView"
import { Timeline } from '@/components/timeline/Timeline'
import GraphView from '@/components/dashboard/Containers/GraphView'
import { useDashboard } from '@/context/DashboardContext'
import { ContainerType, DefaultContainerSize } from '@/types/containers'
import { Responsive, WidthProvider } from "react-grid-layout"
import DropZone from '@/components/ui/dropdown/DropZone'
import { StateView } from '@/components/dashboard/Containers/StateView'
import TargetView from '@/components/dashboard/Containers/TargetView'
import { MainWaitingView } from '@/components/dashboard/MainWaitingView'
import cat from '@lottie/cat.json'
import LoggerView from '@/components/dashboard/Containers/LoggerView'
import { EventView } from '@/components/dashboard/Containers/EventView'
import { StatefulEventView } from '@/components/dashboard/Containers/StatefulEventView'
import { ActionView } from '@/components/dashboard/Containers/ActionView'
import ContextMenu, { ContextMenuPosition } from '@/components/ui/dropdown/ContextMenu'
import { useAddContainer } from '@/hooks/useAddContainer'
import { pixelOffsetToGridPosition } from '@/lib/gridPosition'

const ResponsiveGridLayout = WidthProvider(Responsive)

const gridSize = {lg: 19, md: 16, sm: 14, xs: 6, xxs: 2}

// react-grid-layout's own default breakpoints - we don't override the `breakpoints`
// prop below, so this must stay in sync with what it falls back to internally.
const gridBreakpoints = {lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}

// Elements a background right-click shouldn't fire on: containers handle their own
// context menu, and this marks other regions (e.g. the timeline) as off-limits too.
const BACKGROUND_CONTEXT_MENU_IGNORE_SELECTOR = ".react-grid-item, [data-no-bg-context-menu]"

export default function Dashboard() {
  const {containers, index, containerRenderKey, updateContainerSize, parseFiles} = useDashboard()
  const { options: addContainerOptions, addContainer, getOptionLabel, getOptionDescription } = useAddContainer()
  const [ backgroundMenuPosition, setBackgroundMenuPosition ] = useState<ContextMenuPosition | null>(null)
  // Captured at right-click time (pixel offset within the grid), then turned into a
  // grid x/y once the user picks a container type, since itemWidth varies by type.
  const [ pendingGridClick, setPendingGridClick ] = useState<{ containerWidth: number, offsetX: number, offsetY: number } | null>(null)
  const hasContainers = containers.length > 0

  const handleBackgroundContextMenu = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest(BACKGROUND_CONTEXT_MENU_IGNORE_SELECTOR)) return
    event.preventDefault()
    setBackgroundMenuPosition({ x: event.clientX, y: event.clientY })

    const gridEl = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(".react-grid-layout")
    if (!gridEl) {
      setPendingGridClick(null)
      return
    }
    const rect = gridEl.getBoundingClientRect()
    setPendingGridClick({
      containerWidth: rect.width,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    })
  }

  const addContainerAtClick = (value: string) => {
    if (!pendingGridClick) {
      addContainer(value)
      return
    }
    const gridPosition = pixelOffsetToGridPosition({
      containerWidth: pendingGridClick.containerWidth,
      offsetX: pendingGridClick.offsetX,
      offsetY: pendingGridClick.offsetY,
      breakpoints: gridBreakpoints,
      cols: gridSize,
      itemWidth: DefaultContainerSize(value as ContainerType).w,
    })
    addContainer(value, gridPosition)
  }

  return (
    <div className="relative h-full w-full flex flex-col" onContextMenu={ handleBackgroundContextMenu }>
      { !index?.current && !hasContainers ? (
        <div className={ 'min-h-[calc(100vh-100px)] items-center w-full flex' }>
          <MainWaitingView animation={ cat } title={ "Drag log file, or start Live Session" }/>
        </div>
      ) : (
        <>
          <ResponsiveGridLayout
            className="layout mb-48"
            cols={ gridSize }
            rowHeight={ 50 }
            autoSize={ true }
            allowOverlap={ false }
            isDraggable={ true }
            draggableHandle=".drag-handle"
            onDragStop={ layouts => {
              layouts.forEach(layout => updateContainerSize(layout))
            } }
            onResizeStop={ layouts => {
              layouts.forEach(layout => updateContainerSize(layout))
            } }
            draggableCancel={ "button, [role='button'], a, input, textarea, select, .no-drag, .drag-cancel" }
          >
            { containers.map((container) => {
              switch (container.type) {
                case ContainerType.graph:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* Keep the grid item key stable for layout persistence, but remount the
                          inner view after reset so its local UI state is cleared. */}
                      {/* @ts-expect-error ignore*/ }
                      <GraphView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.table:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <TableView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.state:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <StateView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.event:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <EventView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                  case ContainerType.statefulEvent:
                      return (
                          <div key={ container.id } data-grid={ container.gridLayout }>
                              {/* @ts-expect-error ignore */ }
                              <StatefulEventView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                          </div>
                      )
                case ContainerType.target:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <TargetView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.logs:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      <LoggerView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.action:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <ActionView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                default:
                  return null
              }
            }) }
          </ResponsiveGridLayout>
          { index?.current && (
            <div className="fixed bottom-0 left-0 w-full z-50" data-no-bg-context-menu>
              <Timeline/>
            </div>
          ) }
        </>
      ) }

      <ContextMenu
        position={ backgroundMenuPosition }
        onClose={ () => setBackgroundMenuPosition(null) }
        title="Add Container"
        options={ addContainerOptions }
        getOptionLabel={ getOptionLabel }
        getOptionDescription={ getOptionDescription }
        onOptionClick={ addContainerAtClick }
      />

      <DropZone onFilesDropped={ (files) => {
        parseFiles(files).then()
      } }/>
    </div>
  )
}
