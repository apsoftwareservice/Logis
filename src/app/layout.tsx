import { Outfit } from 'next/font/google'
import './globals.css'

import { SidebarProvider } from '@/context/SidebarContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { DashboardProvider } from '@/context/DashboardContext'
import { Slide, ToastContainer } from 'react-toastify'
import '/node_modules/react-grid-layout/css/styles.css'
import '/node_modules/react-resizable/css/styles.css'

const outfit = Outfit({
  subsets: [ "latin" ]
})

export default function RootLayout({children}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
    <body className={ `${ outfit.className } dark:bg-gray-900` }>
    <ThemeProvider>
      <SidebarProvider>
        <DashboardProvider>
          { children }
        </DashboardProvider>
      </SidebarProvider>
    </ThemeProvider>
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
      theme="system"
      transition={ Slide }
    />
    </body>
    </html>
  )
}
