"use client"
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton"
import { useSidebar } from "@/context/SidebarContext"
import Image from "next/image"
import Link from "next/link"
import React, { useState } from "react"
import { useDashboard } from '@/context/DashboardContext'
import Search from '@/components/header/Search'
import AddContainer from '@/components/header/AddContainer'
import GridController from '@/components/header/GridController'
import LiveSession from '@/components/header/LiveSession'
import Badge from '@/components/ui/badge/Badge'
import ExportPreset from '@/components/header/ExportPreset'

const AppHeader: React.FC = () => {
  const {index, sessionId} = useDashboard()

  return (
    <header
      className="sticky top-0 flex w-full bg-white border-gray-200 z-50 dark:border-gray-800 dark:bg-gray-900 border-b">
      <div className="flex items-center justify-between grow px-3">
        <div className="flex items-center w-[70%] gap-2 py-3 border-gray-200 dark:border-gray-800 justify-normal">
          <Link href="/">
            <>
              <Image
                className="dark:hidden max-w-[100px]"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={ 100 }
                height={ 40 }
                style={ {width: 'auto', height: 'auto'} }
                priority={ true }
              />
              <Image
                className="hidden dark:block max-w-[100px]"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={ 100 }
                height={ 40 }
                style={ {width: 'auto', height: 'auto'} }
                priority={ true }
              />
            </>
          </Link>

          <Search options={ index?.current?.listTypes() ?? [] }/>
        </div>
        <div className={ `flex items-center gap-2 pr-2 py-4 justify-end lg:px-0` }>
          { sessionId && (
            <Badge variant={ 'solid' } color={ 'dark' }>
              { sessionId }
            </Badge>
          ) }
          <LiveSession/>
          { index?.current && <ExportPreset/> }
          { index?.current && <GridController/> }
          <ThemeToggleButton/>
          { index?.current && <AddContainer/> }
        </div>
      </div>
    </header>
  )
}

export default AppHeader
