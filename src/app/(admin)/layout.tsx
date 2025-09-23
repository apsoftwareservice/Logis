"use client"

import { useSidebar } from "@/context/SidebarContext"
import AppHeader from "@/layout/AppHeader"
import React from "react"
import { Slide, ToastContainer } from 'react-toastify'
import { useTheme } from '@/context/ThemeContext'

export default function AdminLayout({children}: { children: React.ReactNode; }) {
  const {isExpanded, isHovered, isMobileOpen} = useSidebar()
  const {theme} = useTheme()
  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]"

  return (
    <div className="min-h-screen xl:flex">
      {/*comment this out to allow sidebar*/ }
      {/*<AppSidebar />*/ }
      {/*<Backdrop />*/ }
      {/*comment this out to allow sidebar*/ }
      {/*<div className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}>*/ }
      <div className={ `flex-1 transition-all duration-300 ease-in-out` }>
        <AppHeader/>
        <div className="p-1">{ children }</div>
      </div>
      <ToastContainer
        position="top-center"
        limit={ 3 }
        autoClose={ 1500 }
        hideProgressBar={ false }
        newestOnTop={ true }
        closeOnClick={ false }
        closeButton={true}
        rtl={ true }
        pauseOnFocusLoss
        draggable
        stacked
        pauseOnHover
        theme={theme}
        transition={ Slide }
      />
    </div>
  )
}
