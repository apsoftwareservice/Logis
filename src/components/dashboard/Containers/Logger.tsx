"use client"

import React, { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import GenericTable from "../../tables/GenericTable"
import { useDashboard } from '@/context/DashboardContext'
import { DashboardContainer, LogsModel } from "@/types/containers"


export default function Logger({container}: { container: DashboardContainer<LogsModel> }) {
  const {logs} = useDashboard()

  const inferredColumns: ColumnDef<object, any>[] = useMemo(() => {
    const keys = Object.keys(logs[0]) as (keyof LogsModel)[]

    return keys.map(k => ({
      accessorKey: k,
      header: k
    }))

  }, [ logs ])

  return <GenericTable data={ logs } columns={ inferredColumns } container={ container } />
}