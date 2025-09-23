"use client"

import React from "react"
import { Upload } from "lucide-react"
import TooltipWrapper from "@/components/ui/tooltip/TooltipWrapper"

export default function UploadFile({onFileSelectAction}: { onFileSelectAction?: (file: File) => void; }) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files && e.target.files[0]
    if (file && onFileSelectAction) {
      onFileSelectAction(file)
    }
    // Clear the input so selecting the same file again still triggers onChange
    e.currentTarget.value = ""
  }

  return (
    <div className="relative">
      <input
        ref={ inputRef }
        type="file"
        className="hidden"
        onChange={ handleFileChange }
      />

      <TooltipWrapper content={ <div>Upload</div> } side={ 'bottom' }>
        <button
          className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          onClick={ handleButtonClick }
          aria-label="Upload file"
        >
          <Upload width={ 20 } height={ 20 }/>
        </button>
      </TooltipWrapper>
    </div>
  )
}