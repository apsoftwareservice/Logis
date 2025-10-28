"use client"

import React, { useState } from "react"
import { Disc, X } from "lucide-react"
import { useDashboard } from '@/context/DashboardContext'
import { motion, AnimatePresence } from 'framer-motion'
import LottieAnimation from '@/components/ui/lottie/LottieAnimation'
import animation from '@lottie/live-on.json'
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'
import { cn } from '@/lib/utils'

export default function LiveSession() {
    const { isLiveSession, handleLiveSessionStateChange } = useDashboard()
    const [showPopup, setShowPopup] = useState(false)
    const [customId, setCustomId] = useState("")

    const handleOpenPopup = () => setShowPopup(true)
    const handleClosePopup = () => setShowPopup(false)

    const handleStartLive = () => {
        handleLiveSessionStateChange(true)
        setShowPopup(false)
    }

    const handleCustomId = () => {
        const trimmedId = customId.trim()
        if (trimmedId) {
            handleLiveSessionStateChange(true, trimmedId)
            console.log("Custom session ID:", customId)
            setShowPopup(false)
        }
    }

    return (
        <>
            <TooltipWrapper content={<div>Live Session</div>} side="bottom">
                <button
                    className={cn(
                        "relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
                        isLiveSession && 'border-red-800'
                    )}
                    onClick={handleOpenPopup}
                    aria-label="Start Live Session"
                >
                    {isLiveSession ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6 }}
                            className="relative right-[12px]"
                        >
                            <LottieAnimation animationJson={animation} width="170%" height="170%" />
                        </motion.div>
                    ) : (
                        <Disc width={20} height={20} />
                    )}
                </button>
            </TooltipWrapper>

            {/* POPUP */}
            <AnimatePresence>
                {showPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-[320px] relative"
                        >
                            <button
                                onClick={handleClosePopup}
                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                            >
                                <X size={18} />
                            </button>

                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                                Start Live Session
                            </h3>

                            <div className="flex flex-col gap-10">
                                <button
                                    onClick={handleStartLive}
                                    className="w-full bg-brand-blue hover:bg-brand-blue-dark text-white py-2 rounded-lg transition"
                                >
                                    Start Live Session
                                </button>

                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={customId}
                                        onChange={(e) => setCustomId(e.target.value)}
                                        placeholder="Enter custom session ID"
                                        className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-transparent text-gray-800 dark:text-gray-200"
                                    />
                                    <button
                                        onClick={handleCustomId}
                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg transition"
                                    >
                                        Start with Custom ID
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
