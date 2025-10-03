"use client"

import React from "react"
import TableView from "@/components/dashboard/Containers/TableView"
import { Timeline } from '@/components/timeline/Timeline'
import GraphView from '@/components/dashboard/Containers/GraphView'
import { useDashboard } from '@/context/DashboardContext'
import { ContainerType } from '@/types/containers'
import { Responsive, WidthProvider } from "react-grid-layout"
import DropZone from '@/components/ui/dropdown/DropZone'
import { DashboardState } from '@/components/dashboard/Containers/DashboardState'
import MonthlyTarget from '@/components/dashboard/Containers/MonthlyTarget'
import { MainWaitingView } from '@/components/dashboard/MainWaitingView'
import cat from '@lottie/cat.json'
import Logger from '@/components/dashboard/Containers/Logger'
import { DashboardEvent } from '@/components/dashboard/Containers/DashboardEvent'

const ResponsiveGridLayout = WidthProvider(Responsive)

const gridSize = {lg: 19, md: 16, sm: 14, xs: 6, xxs: 2}

export default function Dashboard() {
  const {containers, lockGrid, index, updateContainerSize, parseFiles} = useDashboard()

  return (
    <div className="relative h-full w-full flex flex-col">
      { !index?.current ? (
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
                      <GraphView container={ container }/>
                    </div>
                  )
                case ContainerType.table:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <TableView container={ container }/>
                    </div>
                  )
                case ContainerType.state:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <DashboardState container={ container }/>
                    </div>
                  )
                case ContainerType.event:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <DashboardEvent container={ container }/>
                    </div>
                  )
                case ContainerType.target:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      {/* @ts-expect-error ignore */ }
                      <MonthlyTarget container={ container }/>
                    </div>
                  )
                case ContainerType.logs:
                  return (
                    <div key={ container.id } data-grid={ container.gridLayout }>
                      <Logger container={ container }/>
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
