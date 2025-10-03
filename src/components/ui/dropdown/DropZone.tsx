"use client"

import React, { type DragEvent as ReactDragEvent, useEffect, useRef, useState } from "react"
import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import animation from '@lottie/blackHole.json'

type DropZoneProps = {
  onFilesDropped?: (files: File[]) => void;
  prompt?: string;
};

const DropZone: React.FC<DropZoneProps> = ({onFilesDropped, prompt}) => {
  const [ visible, setVisible ] = useState(false)
  const dragCounter = useRef(0)

  const wisdom = [
    'The clouds are there because they are not somewhere else.',
    'A chair is only a chair until it isn’t.',
    'Sometimes nothing really means anything in particular.',
    'The pen is on the table, and that’s the whole story.',
    'Walking forward is just not walking backward.',
    'The sound of silence is only quiet if you notice it.',
    'A door stays closed unless it is open.',
    'Circles are round because they aren’t squares.',
    'Waiting is just not doing something else.',
    'The floor supports whatever is on top of it.',
    'Time goes on even when it is ignored.',
    'Shadows exist because light exists.',
    'Breathing is only not holding your breath.',
    'The end of the line is only where it stops.',
    'Something happens only because it doesn’t not happen.',
    'Every ending is the start of something not yet begun.',
    'Stillness is movement waiting to happen.',
    'The sky is endless only because it has no edges.',
    'Truth is what remains when lies are forgotten.',
    'An unanswered question is its own kind of answer.',
    'The river flows without asking where it goes.',
    'To see clearly, sometimes you must close your eyes.',
    'A whisper can be louder than a shout if you listen.',
    'What is heavy to one may be light to another.',
    'The longest journey begins with a single pause.',
    'Dreams are real while they are being dreamed.',
    'Even the smallest stone changes the river’s path.',
    'The moment you notice time, it has already passed.',
    'To stand still is also to move, but differently.',
    'What you seek is often found when you stop searching.'
  ]

  // Helpers
  const isFileDrag = (e: DragEvent | ReactDragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes("Files")

  const show = () => setVisible(true)
  const hide = () => {
    dragCounter.current = 0
    setVisible(false)
  }

  // Global listeners so the overlay appears even before hovering the box
  useEffect(() => {
    const onWindowDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      dragCounter.current += 1
      show()
      e.preventDefault()
    }

    const onWindowDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
    }

    const onWindowDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      dragCounter.current = Math.max(0, dragCounter.current - 1)
      if (dragCounter.current === 0) hide()
    }

    const onWindowDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      const files = Array.from(e.dataTransfer?.files ?? [])
      hide()
      onFilesDropped?.(files)
    }

    window.addEventListener("dragenter", onWindowDragEnter)
    window.addEventListener("dragover", onWindowDragOver)
    window.addEventListener("dragleave", onWindowDragLeave)
    window.addEventListener("drop", onWindowDrop)

    return () => {
      window.removeEventListener("dragenter", onWindowDragEnter)
      window.removeEventListener("dragover", onWindowDragOver)
      window.removeEventListener("dragleave", onWindowDragLeave)
      window.removeEventListener("drop", onWindowDrop)
    }
  }, [ onFilesDropped ])

  // Overlay handlers (keep counter stable when moving inside the overlay)
  const onOverlayDragEnter = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return
    dragCounter.current += 1
    e.preventDefault()
  }

  const onOverlayDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
  }

  const onOverlayDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) hide()
  }

  const onOverlayDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files ?? [])
    hide()
    onFilesDropped?.(files)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Drop files"
      onDragEnter={ onOverlayDragEnter }
      onDragOver={ onOverlayDragOver }
      onDragLeave={ onOverlayDragLeave }
      onDrop={ onOverlayDrop }
      style={ {
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.40)",
        zIndex: 9999,
        pointerEvents: "auto"
      } }
    >
      <div className={ 'bg-white dark:bg-gray-900 border-gray-700 py-10 px-8 border border-dashed' }
           style={ {
             minWidth: 320,
             minHeight: 160,
             borderRadius: 12,
             display: "flex",
             alignItems: "center",
             justifyContent: "center",
             fontFamily: "system-ui, sans-serif",
             textAlign: "center",
             lineHeight: 1.4
           } }
      >
        <div className={ 'flex-col flex justify-between items-center w-full h-full' }>
          <div className={ 'flex-col flex justify-center items-center h-full' }>
            <div className={ 'italic dark:text-white w-11/12' }>
              { `"${ wisdom[Math.floor(Math.random() * wisdom.length)] }"` }
            </div>
            <motion.div
              initial={ {opacity: 0, y: 10} }
              animate={ {opacity: 1, y: 0} }
              transition={ {duration: 0.6, ease: 'easeOut'} }
            >
              <LottieAnimation animationJson={ animation } className={ 'h-[320px]' }/>
            </motion.div>
          </div>
          <div className={ 'h-10 text-gray-400 text-[0.8rem]' }>Drop it</div>
        </div>
      </div>
    </div>
  )
}

export default DropZone