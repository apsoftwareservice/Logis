"use client"

import React from "react"
import TableView from "@/components/dashboard/Containers/TableView"
import { Timeline } from '@/components/timeline/Timeline'
import GraphView from '@/components/dashboard/Containers/GraphView'
import { useDashboard } from '@/context/DashboardContext'
import { ContainerType } from '@/types/containers'
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

const ResponsiveGridLayout = WidthProvider(Responsive)

const gridSize = {lg: 19, md: 16, sm: 14, xs: 6, xxs: 2}

export default function Dashboard() {
  const {containers, lockGrid, index, containerRenderKey, updateContainerSize, parseFiles} = useDashboard()
  const hasContainers = containers.length > 0

  return (
    <div className="relative h-full w-full flex flex-col">
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
              switch (container.type) {
                case ContainerType.graph:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore*/ }
                      {/* Keep the grid item key stable for layout persistence, but remount the
                          inner view after reset so its local UI state is cleared. */}
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
            <div className="fixed bottom-0 left-0 w-full z-50">
              <Timeline/>
            </div>
          ) }
        </>
      ) }

      <DropZone onFilesDropped={ (files) => {
        parseFiles(files).then()
      } }/>
    </div>
  )
}
