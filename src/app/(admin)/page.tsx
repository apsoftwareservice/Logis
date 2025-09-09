import React from "react"
import RecentOrders from "@/components/dashboard/RecentOrders"
import { Timeline } from '@/components/timeRange/Timeline'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template"
}


export default function Dashboard() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="grid grid-cols-12 gap-4 md:gap-6 pb-40">
        {/*<div className="col-span-12 space-y-6 xl:col-span-7">*/ }
        {/*  <DashboardMetrics/>*/ }

        {/*  <MonthlySalesChart/>*/ }
        {/*</div>*/ }

        {/*<div className="col-span-12 xl:col-span-5">*/ }
        {/*  <MonthlyTarget/>*/ }
        {/*</div>*/ }

        {/*<div className="col-span-12">*/ }
        {/*  <StatisticsChart/>*/ }
        {/*</div>*/ }

        {/*<div className="col-span-12 xl:col-span-5">*/ }
        {/*  <DemographicCard/>*/ }
        {/*</div>*/ }

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders/>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full z-50">
        <Timeline/>
      </div>
    </div>
  )
}
