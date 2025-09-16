import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { DashboardProvider } from '@/context/DashboardContext'
import { Bounce, Slide, ToastContainer } from 'react-toastify'
import '/node_modules/react-grid-layout/css/styles.css'
import '/node_modules/react-resizable/css/styles.css'
import DropZone from '@/components/ui/dropdown/DropZone'

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <DashboardProvider>
            {children}
            </DashboardProvider>
          </SidebarProvider>
        </ThemeProvider>
        <ToastContainer
          position="top-center"
          limit={10}
          autoClose={4300}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={true}
          pauseOnFocusLoss
          draggable
          stacked
          pauseOnHover
          theme="system"
          transition={Slide}
        />
      </body>
    </html>
  );
}
