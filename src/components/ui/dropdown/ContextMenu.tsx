"use client"

import React, { useEffect, useLayoutEffect, useRef } from "react"
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem"
import TooltipWrapper from "@/components/ui/tooltip/TooltipWrapper"
import { CircleHelp, X } from "lucide-react"
import { cn, capitalize } from "@/lib/utils"
import { CLOSE_DASHBOARD_DROPDOWNS_EVENT } from "@/components/ui/dropdown/dropdownEvents"

export type ContextMenuPosition = { x: number; y: number }

const MENU_MARGIN = 8

export default function ContextMenu({position, onClose, title, options = [], onOptionClick, getOptionLabel, getOptionDescription, className}: {
  position: ContextMenuPosition | null
  onClose: () => void
  title?: string
  options: string[]
  onOptionClick?: (option: string) => void
  getOptionLabel?: (option: string) => string
  getOptionDescription?: (option: string) => string | undefined
  className?: string
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Runs synchronously after the menu mounts at the raw click point, but before
  // paint, so it can measure the rendered size and nudge it back on-screen with
  // no visible flash. A plain useEffect would be one render too late here: the
  // menu is still absent from the DOM (still returning null) on the render where
  // `position` first changes, so its node wouldn't exist yet to measure.
  useLayoutEffect(() => {
    if (!position) return
    const node = menuRef.current
    if (!node) return

    node.style.left = `${ position.x }px`
    node.style.top = `${ position.y }px`

    const { width, height } = node.getBoundingClientRect()
    const x = Math.min(position.x, window.innerWidth - width - MENU_MARGIN)
    const y = Math.min(position.y, window.innerHeight - height - MENU_MARGIN)
    node.style.left = `${ Math.max(MENU_MARGIN, x) }px`
    node.style.top = `${ Math.max(MENU_MARGIN, y) }px`
  }, [ position ])

  useEffect(() => {
    if (!position) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    // Note: outside right-clicks are handled by "mousedown" too (it fires before
    // "contextmenu"), so a fresh right-click elsewhere first closes this menu and
    // then whichever handler owns that target's contextmenu event runs cleanly.
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener(CLOSE_DASHBOARD_DROPDOWNS_EVENT, onClose)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener(CLOSE_DASHBOARD_DROPDOWNS_EVENT, onClose)
    }
  }, [ position, onClose ])

  if (!position) return null

  return (
    <div
      ref={ menuRef }
      style={ { top: position.y, left: position.x } }
      className={ cn("fixed z-[999] flex max-h-[500px] w-56 flex-col overflow-y-auto custom-scrollbar rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark", className) }
    >
      { title && (
        <div className="flex items-center justify-between px-1 pt-1 pb-2 mb-1 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            { title }
          </h5>
          <button
            onClick={ onClose }
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-4 w-4"/>
          </button>
        </div>
      ) }
      { options.length > 0 ? (
        options.map((option, idx) => (
          <DropdownItem
            key={ idx }
            onItemClick={ () => {
              onClose()
              onOptionClick?.(option)
            } }
            className="flex items-center justify-between gap-3 rounded-lg p-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              { getOptionLabel?.(option) ?? capitalize(option) }
            </span>
            { getOptionDescription?.(option) && (
              <TooltipWrapper
                content={
                  <div className="max-w-56 text-xs leading-5">
                    { getOptionDescription(option) }
                  </div>
                }
                side="right"
                className="max-w-56 rounded-md bg-black px-3 py-2 text-white shadow-lg dark:bg-white dark:text-black"
                disableHoverableContent
              >
                <span
                  className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={ (event) => event.stopPropagation() }
                >
                  <CircleHelp className="h-4 w-4"/>
                </span>
              </TooltipWrapper>
            ) }
          </DropdownItem>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">No options</div>
      ) }
    </div>
  )
}
