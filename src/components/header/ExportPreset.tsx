import React from "react"

import { FileDown } from "lucide-react"
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'
import { saveAs } from "file-saver"

export default function ExportPreset() {
  const {lockGrid, containers} = useDashboard()

  const handleExport = async () => {
    try {
      const json = JSON.stringify(containers, null, 2)
      const blob = new Blob([ json ], { type: "application/json;charset=utf-8" })

      // If the browser supports the File System Access API, let the user pick a location
      if ("showSaveFilePicker" in window) {
        const pickerOpts = {
          suggestedName: "containers.json",
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] }
            }
          ]
        } as any

        // @ts-expect-error: showSaveFilePicker may not exist in some TS lib.dom versions
        const handle = await window.showSaveFilePicker(pickerOpts)
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        // Fallback for browsers without the API (downloads to default location)
        saveAs(blob, "containers.json")
      }
    } catch (error) {
      console.error("Failed to export containers", error)
    }
  }

  return (
    <TooltipWrapper content={ <div>{ 'Export Preset' }</div> } side={ 'bottom' }>
      <button
        className={ cn(
          "relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
          lockGrid ? "" : "bg-green-50 dark:bg-gray-800 border-green-800"
        ) }
        onClick={ handleExport }
        aria-label="Upload file"
      >
        <FileDown width={ 20 } height={ 20 }/>
      </button>
    </TooltipWrapper>
  )
}