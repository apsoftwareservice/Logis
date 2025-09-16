"use client"

import React from "react"
import TableView from "@/components/dashboard/table/TableView"
import { Timeline } from '@/components/timeRange/Timeline'
import GraphView from '@/components/dashboard/graph/GraphView'
import { useDashboard } from '@/context/DashboardContext'
import { ContainerType } from '@/types/containers'
import { Responsive, WidthProvider } from "react-grid-layout"
import DropZone from '@/components/ui/dropdown/DropZone'

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function Dashboard() {
  const {containers, lockGrid, logIndex, updateContainerSize, parseLogFile} = useDashboard()

  return (
    <div className="relative min-h-screen flex flex-col">
      <ResponsiveGridLayout
        className="layout mb-32"
        cols={ {lg: 12, md: 10, sm: 6, xs: 4, xxs: 2} }
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
                  {/* @ts-expect-error */ }
                  <GraphView container={ container }/>
                </div>
              )
            case ContainerType.table:
              return (
                <div key={ container.id } data-grid={ container.gridLayout }>
                  {/* @ts-expect-error */ }
                  <TableView container={ container }/>
                </div>
              )
            default:
              return null
          }
        }) }
      </ResponsiveGridLayout>
      { logIndex ? (
        <div className="fixed bottom-0 left-0 w-full z-50">
          <Timeline/>
        </div>
      ) : (
        <div className={ 'w-full h-full' }>

        </div>
      ) }
      <DropZone onFilesDropped={ (files) => {
        parseLogFile(files[0]).then()
      } }/>
    </div>
  )
}
