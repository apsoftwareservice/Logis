"use client"

import React, { useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { useDashboard } from '@/context/DashboardContext'
import { getFirstSeenObjectKeys } from '@/lib/utils'
import { DashboardContainer, LogsModel } from "@/types/containers"
import GenericTable from '@/components/tables/GenericTable'


export default function LoggerView({container}: { container: DashboardContainer<LogsModel> }) {
  const {logs, followLogs} = useDashboard()

  const inferredColumns: ColumnDef<object, any>[] = useMemo(() => {
    if (!logs || logs.length === 0) {
      return []
    }

    return getFirstSeenObjectKeys(logs).map((k) => ({
      accessorKey: k,
      header: k
    }))
  }, [ logs ])

  return <GenericTable data={ logs } columns={ inferredColumns } container={ container } followLogs={followLogs} />
}
