"use client"

import React, { useEffect, useState } from "react"

import {Disc} from "lucide-react"
import { useDashboard } from '@/context/DashboardContext'
import {createEventSourceInput} from "@/core/sources/eventSource";

export default function LiveSession() {
  const {startEngineWithSource} = useDashboard()
   const [on, setOn] = useState(false)

    useEffect(() => {
    if (on) {
        startEngineWithSource(createEventSourceInput('http://localhost:4000/stream?token=1234'), true).then()
    }
    }, [on, startEngineWithSource])

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={ () => setOn(!on) }
        aria-label="Upload file"
      >
        { on ? (<Disc fill={'red'} width={ 20 } height={ 20 }/>) : (<Disc width={ 20 } height={ 20 }/>) }
      </button>
    </div>
  )
}