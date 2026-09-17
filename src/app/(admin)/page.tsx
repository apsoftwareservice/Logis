"use client"

import React, { useState } from "react"
import TableView from "@/components/dashboard/Containers/TableView"
import { Timeline } from '@/components/timeline/Timeline'
import GraphView from '@/components/dashboard/Containers/GraphView'
import { useDashboard } from '@/context/DashboardContext'
import { ContainerType, DefaultContainerSize, MIN_CONTAINER_H, MIN_CONTAINER_W } from '@/types/containers'
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
import { useGridColumnWidth } from '@/hooks/useGridColumnWidth'
import { measureTitleWidth } from '@/lib/measureTitleWidth'

const ResponsiveGridLayout = WidthProvider(Responsive)

// Doubled from {lg: 19, md: 16, sm: 14, xs: 6, xxs: 2} for twice the horizontal
// resize precision - every type's default w in types/containers.ts was doubled
// to match, so existing containers keep their current on-screen width.
const gridSize = {lg: 38, md: 32, sm: 28, xs: 12, xxs: 4}
const GRID_MARGIN: [ number, number ] = [ 5, 5 ]

// Fixed pixel cost of a container's header chrome at the current padding/gaps
// in BaseView.tsx (card padding ~24px, row gap ~8px, the three-dot icon ~18px)
// - i.e. everything in the header besides the title text itself. This branch's
// BaseView has no drag handle, unlike the sibling drag-handle branch - don't
// copy that branch's chrome estimate here without rechecking.
const CHROME_PX = 55
// Same conservative estimate as before, used only until the live column width
// below is measured (first render, before the layout effect runs).
const ASSUMED_COL_PX = 40

// react-grid-layout's own default breakpoints - we don't override the `breakpoints`
// prop below, so this must stay in sync with what it falls back to internally.
const gridBreakpoints = {lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0}

// Elements a background right-click shouldn't fire on: containers handle their own
// context menu, and this marks other regions (e.g. the timeline) as off-limits too.
const BACKGROUND_CONTEXT_MENU_IGNORE_SELECTOR = ".react-grid-item, [data-no-bg-context-menu]"

export default function Dashboard() {
  const {containers, lockGrid, index, containerRenderKey, updateContainerSize, parseFiles} = useDashboard()
  const { options: addContainerOptions, addContainer, getOptionLabel, getOptionDescription } = useAddContainer()
  const [ backgroundMenuPosition, setBackgroundMenuPosition ] = useState<ContextMenuPosition | null>(null)
  // Captured at right-click time (pixel offset within the grid), then turned into a
  // grid x/y once the user picks a container type, since itemWidth varies by type.
  const [ pendingGridClick, setPendingGridClick ] = useState<{ containerWidth: number, offsetX: number, offsetY: number } | null>(null)
  const hasContainers = containers.length > 0
  const [ gridWrapperRef, gridMetrics ] = useGridColumnWidth(gridSize, gridBreakpoints, GRID_MARGIN)

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

  // A container can never be resized narrower than what it takes to show its
  // own title in full - only a shorter title makes a smaller container possible.
  const minWidthForTitle = (title: string): number => {
    const neededPx = measureTitleWidth(title) + CHROME_PX
    const colWidth = gridMetrics?.colWidth ?? ASSUMED_COL_PX
    return Math.min(
      Math.max(MIN_CONTAINER_W, Math.ceil(neededPx / colWidth)),
      gridMetrics?.cols ?? Infinity,
    )
  }

  return (
    <div className="relative h-full w-full flex flex-col" onContextMenu={ handleBackgroundContextMenu }>
      { !index?.current && !hasContainers ? (
        <div className={ 'min-h-[calc(100vh-100px)] items-center w-full flex' }>
          <MainWaitingView animation={ cat } title={ "Drag log file, or start Live Session" }/>
        </div>
      ) : (
        <div ref={ gridWrapperRef }>
          <ResponsiveGridLayout
            className="layout mb-48"
            cols={ gridSize }
            rowHeight={ 25 }
            margin={ GRID_MARGIN }
            autoSize={ true }
            allowOverlap={ false }
            isDraggable={ !lockGrid }
            onDragStop={ layouts => {
              layouts.forEach(layout => updateContainerSize(layout))
            } }
            onResizeStop={ layouts => {
              layouts.forEach(layout => updateContainerSize(layout))
            } }
            draggableCancel={ "button, [role='button'], a, input, textarea, select, .no-drag, .drag-cancel" }
          >
            { containers.map((container) => {
              // Floors resizing so a container can never shrink below what its
              // header chrome needs, or below what its own title needs to show
              // in full - a shorter title is the only way to get it narrower.
              const minW = minWidthForTitle(container.title)
              const gridItemProps = {
                ...container.gridLayout,
                w: Math.max(container.gridLayout.w, minW),
                minW,
                minH: MIN_CONTAINER_H,
              }
              switch (container.type) {
                case ContainerType.graph:
                  return (
                    <div key={ container.id } data-grid={ gridItemProps }>
                      {/* Keep the grid item key stable for layout persistence, but remount the
                          inner view after reset so its local UI state is cleared. */}
                      {/* @ts-expect-error ignore*/ }
                      <GraphView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.table:
                  return (
                    <div key={ container.id } data-grid={ gridItemProps }>
                      {/* @ts-expect-error ignore */ }
                      <TableView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.state:
                  return (
                    <div key={ container.id } data-grid={ gridItemProps }>
                      {/* @ts-expect-error ignore */ }
                      <StateView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.event:
                  return (
                    <div key={ container.id } data-grid={ gridItemProps }>
                      {/* @ts-expect-error ignore */ }
                      <EventView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                  case ContainerType.statefulEvent:
                      return (
                          <div key={ container.id } data-grid={ gridItemProps }>
                              {/* @ts-expect-error ignore */ }
                              <StatefulEventView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                          </div>
                      )
                case ContainerType.target:
                  return (
                    <div key={ container.id } data-grid={ gridItemProps }>
                      {/* @ts-expect-error ignore */ }
                      <TargetView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.logs:
                  return (
                    <div key={ container.id } data-grid={ gridItemProps }>
                      <LoggerView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                case ContainerType.action:
                  return (
                    <div key={ container.id } data-grid={ gridItemProps }>
                      {/* @ts-expect-error ignore */ }
                      <ActionView key={ `${ containerRenderKey }-${ container.id }` } container={ container }/>
                    </div>
                  )
                default:
                  return null
              }
            }) }
          </ResponsiveGridLayout>
        </div>
      ) }
      { index?.current && (
        <div className="fixed bottom-0 left-0 w-full z-50" data-no-bg-context-menu>
          <Timeline/>
        </div>
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
