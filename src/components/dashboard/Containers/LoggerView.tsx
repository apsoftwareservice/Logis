"use client"

import React, { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { useDashboard } from '@/context/DashboardContext'
import { DashboardContainer, LogsModel } from "@/types/containers"
import GenericTable from '@/components/tables/GenericTable'


export default function LoggerView({container}: { container: DashboardContainer<LogsModel> }) {
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