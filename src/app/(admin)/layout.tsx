"use client"

import AppHeader from "@/layout/AppHeader"
import React from "react"
import { Slide, ToastContainer } from 'react-toastify'
import { useTheme } from '@/context/ThemeContext'
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop"

export default function AdminLayout({children}: { children: React.ReactNode; }) {
  const {theme} = useTheme()

  return (
    <div className="min-h-screen xl:flex">
      <Backdrop/>
      <div className={`flex-1 transition-all duration-300 ease-in-out`}>
        <AppHeader/>
        <div className={'flex h-full w-full'}>
          <AppSidebar/>
        <div className="flex-1 p-1">{children}</div>
      </div>

      </div>
        <ToastContainer
        position="top-center"
        limit={ 3 }
        autoClose={ 3500 }
        hideProgressBar={ false }
        newestOnTop={ true }
        closeOnClick={ false }
        closeButton={true}
        rtl={ false }
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
