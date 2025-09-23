"use client"

import React from "react"

import { Disc } from "lucide-react"
import { useDashboard } from '@/context/DashboardContext'
import { motion } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import animation from '@lottie/live-on.json'
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'
import { cn } from '@/lib/utils'

export default function LiveSession() {
  const {isLiveSession, handleLiveSessionStateChange} = useDashboard()

  return (
    <TooltipWrapper content={ <div>Live Session</div> } side={ 'bottom' }>
      <button
        className={ cn("relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
          isLiveSession && 'border-red-800') }
        onClick={ () => handleLiveSessionStateChange(!isLiveSession) }
        aria-label="Upload file"
      >
        { isLiveSession ? (
          <motion.div
            initial={ {opacity: 0, y: 0} }
            animate={ {opacity: 1, y: 0} }
            transition={ {duration: 0.6, ease: 'easeOut'} }
            className={ 'relative right-[12px]' }
          >
            <LottieAnimation animationJson={ animation } className={ '' } width={ '170%' } height={ '170%' }/>
          </motion.div>
        ) : (<Disc width={ 20 } height={ 20 }/>) }

      </button>
    </TooltipWrapper>
  )
}