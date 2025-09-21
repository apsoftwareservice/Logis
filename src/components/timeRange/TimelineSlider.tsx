import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Slider from "rc-slider"
import "rc-slider/assets/index.css"
import { motion } from "framer-motion"
import { Clip, Marker, TimeUnit } from '@/components/timeRange/TimeLine.types'
import {
  addUnit,
  chooseUnit,
  clamp,
  floorToUnitBoundary,
  formatBoundaryLabel,
  formatDate,
  formatTickLabel,
  snapTsToUnit
} from "./Timeline.utils"
import TooltipWrapper from '@/components/ui/tooltip/TooltipWrapper'
import { MarkObj } from 'rc-slider/es/Marks'
import { PanelBottomClose, PanelBottomOpen } from 'lucide-react'

/**
 * TimelineSlider — a movie-editor style time slider with zoom, pan, and markers.
 *
 * Features
 * - Scrubbable playhead with rc-slider
 * - Zoom with Ctrl/Cmd + wheel (or pinch on trackpads)
 * - Pan with Shift + wheel or middle-drag
 * - Sticky time ruler with dynamic tick density
 * - Markers + clip regions (multi-track demo)
 * - Keyboard: ←/→ to nudge 1s, Shift+←/→ to nudge 5s, Home/End
 * - Accessible: aria labels, focus ring, large hit areas
 *
 * Ideal for: video/audio scrubbing, log/event timelines, annotation UIs.
 */



const SPEEDS = [ 1, 8, 13, 21, 44 ] as const

export type TimelineSliderProps = {
  startDate: number; // epoch ms (inclusive bound)
  endDate: number;   // epoch ms (exclusive/upper bound)
  currentTime: number; // epoch ms
  onSeek: (t: number) => void; /** returns epoch timestamp */
  /** Optional: initial visible window in epoch ms */
  initialWindow?: { start: number; end: number };
  markers?: Marker[];
  clips?: Clip[];
  /** Minimum window length (zoom limit) in seconds */
  minWindowSec?: number;
  /** Maximum window length (zoom limit) in seconds */
  maxWindowSec?: number;
  /** Step for slider scrubbing (seconds) */
  step?: number;
};

export default function TimelineSlider({
                                         startDate,
                                         endDate,
                                         currentTime, // epoch ms
                                         onSeek,
                                         initialWindow,
                                         markers = [],
                                         clips = [],
                                         minWindowSec = 1,
                                         maxWindowSec,
                                         step = 0.01
                                       }: TimelineSliderProps) {
  const duration = Math.max(0, (endDate - startDate) / 1000) // seconds

  const timestampToSeconds = useCallback((ts: number) => (ts - startDate) / 1000, [startDate]) // epoch ms -> seconds from start
  const secondsToTimestamp = useCallback((sec: number) => startDate + sec * 1000, [startDate])   // seconds from start -> epoch ms

  const currentSecond = useMemo(() => timestampToSeconds(currentTime), [currentTime, timestampToSeconds])
  const [ isShowingFullSlider, setIsShowingFullSlider ] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ isPlaying, setIsPlaying ] = useState(false)
  const rafRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)

  const [ speedIdx, setSpeedIdx ] = useState(4) // default 1.0x
  const playSpeed = SPEEDS[speedIdx]
  const cycleSpeed = useCallback(() => {
    setSpeedIdx(i => (i + 1) % SPEEDS.length)
  }, [])

  const [ win, setWin ] = useState(() => {
    return {start: 0, end: Math.max(0, duration)}
  })

  const windowLen = win.end - win.start
  const maxWindow = maxWindowSec ?? Math.max(2, duration)

  // Sync visible window when the overall timeline range (startDate/endDate) changes.
  // Without this, the `win` state remains stuck at its initial value and the UI
  // won't reflect new timeline bounds.
  useEffect(() => {
    const d = Math.max(0, duration)
    // Reset the window to the beginning of the new range, clamped to the configured maxWindow.
    setWin({start: 0, end: Math.min(d, maxWindow)})
  }, [ duration, maxWindow ])

  const currentUnit: TimeUnit = useMemo(() => chooseUnit(windowLen), [ windowLen ])

  // Keep playhead inside visible window (auto-pan when scrubbing near edges)
  useEffect(() => {
    if (currentSecond < win.start) {
      const delta = win.start - currentSecond
      setWin(w => ({start: w.start - delta, end: w.end - delta}))
    } else if (currentSecond > win.end) {
      const delta = currentSecond - win.end
      setWin(w => ({start: w.start + delta, end: w.end + delta}))
    }
  }, [currentSecond, win.end, win.start])

  // Drive playback from currentTime to end using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimestampRef.current = null
      return
    }

    const tick = (ts: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = ts
      const dtSec = ((ts - lastTimestampRef.current) / 1000) * Math.max(1, speedIdx)
      lastTimestampRef.current = ts

      const next = Math.min(duration, currentSecond + dtSec)
      if (next >= duration) {
        onSeek(secondsToTimestamp(duration))
        setIsPlaying(false)
        return
      }
      onSeek(secondsToTimestamp(next))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTimestampRef.current = null
    }
  }, [isPlaying, currentSecond, duration, onSeek, speedIdx, secondsToTimestamp])

  // Wheel: zoom with ctrl/cmd, pan with shift (or two-finger horizontal)
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    const x = clamp(e.clientX - rect.left, 0, rect.width)
    const frac = rect.width ? x / rect.width : 0.5 // cursor as fraction of window
    const focusT = win.start + frac * (win.end - win.start)

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomIntensity = 0.0015 // tune feel
      const factor = Math.exp(e.deltaY * zoomIntensity)
      const nextLen = clamp(windowLen * factor, minWindowSec, Math.min(maxWindow, duration || Infinity))
      // Keep the focus point fixed during zoom
      const newStart = clamp(focusT - frac * nextLen, 0, Math.max(0, duration - nextLen))
      setWin({start: newStart, end: newStart + nextLen})
    } else {
      // Pan
      const panSec = (e.deltaY + e.deltaX) * (windowLen / rect.width)
      const newStart = clamp(win.start + panSec, 0, Math.max(0, duration - windowLen))
      setWin({start: newStart, end: newStart + windowLen})
    }
  }, [ win, windowLen, duration, minWindowSec, maxWindow ])

  // Keyboard controls
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const nudgeUnit = (dir: number) => {
      const curTs = secondsToTimestamp(currentSecond)
      const nextTs = addUnit(curTs, currentUnit, dir)
      const clamped = clamp(nextTs, startDate, endDate)
      onSeek(clamped)
    }
    switch (e.key) {
      case "ArrowLeft":
        nudgeUnit(e.shiftKey ? -5 : -1)
        break
      case "ArrowRight":
        nudgeUnit(e.shiftKey ? 5 : 1)
        break
      case "Home":
        onSeek(secondsToTimestamp(0))
        break
      case "End":
        onSeek(secondsToTimestamp(duration))
        break
    }
  }, [secondsToTimestamp, currentSecond, currentUnit, startDate, endDate, onSeek, duration])

  // Generate dynamic tick marks (calendar boundaries for chosen unit)
  const ticks = useMemo(() => {
    if (windowLen <= 0) return [] as number[]
    const startTs = secondsToTimestamp(win.start)
    const endTs = secondsToTimestamp(win.end)

    const unit = currentUnit
    let t = floorToUnitBoundary(startTs, unit)
    // Ensure first tick is not before the visible window
    if (t < startTs) t = addUnit(t, unit, 1)

    const out: number[] = []
    while (t <= endTs) {
      out.push(timestampToSeconds(t))
      t = addUnit(t, unit, 1)
    }
    return out
  }, [windowLen, secondsToTimestamp, win.start, win.end, currentUnit, timestampToSeconds])

  const visibleMarkers = markers.filter(m => {
    const s = timestampToSeconds(m.time)
    return s >= win.start && s <= win.end
  })
  const pct = useCallback((t: number) => 100 * (clamp(t, win.start, win.end) - win.start) / windowLen, [ win.start, win.end, windowLen ])
  // Slider marks (rc-slider supports a marks object). We'll place only at window edges for perf,
  // and render our richer ruler above the rail.
  const sliderProps = {
    min: win.start,
    max: win.end,
    step: step,
    value: clamp(currentSecond, win.start, win.end),
    onChange: (v: number) => {
      const snapped = snapTsToUnit(secondsToTimestamp(v), currentUnit)
      onSeek(secondsToTimestamp(v))
    },
    railStyle: {height: 10, background: "#0f172a"},
    trackStyle: {background: "#10b981", height: 10},
    handleStyle: {
      width: 20,
      height: 20,
      border: "2px solid #10b981",
      background: "white",
      marginTop: -5
      // boxShadow: "0 0 0 3px rgba(16,185,129,0.25)",
    },
    dotStyle: {display: "none"},
    ariaLabelForHandle: "Playhead",
    marks: visibleMarkers.reduce((acc, marker) => {
      const key = timestampToSeconds(marker.time)
      //@ts-expect-error
      acc[key] = {
        style: {color: marker.color ?? "orange"},
        label: <TooltipWrapper key={ marker.id } content={ marker.label } side={ "bottom" } className={ 'text-black' }>
          <div className="w-0 h-0 border-l-5 border-r-5 border-b-8 border-l-transparent border-r-transparent"
               style={ {borderBottomColor: marker.color ?? "#f59e0b"} }/>
        </TooltipWrapper>
      }
      return acc
    }, {} as MarkObj)
  } //as SliderProps

  // Helper to convert absolute seconds to percentage within the visible window
  const visibleClips = clips.filter(c => {
    const s = timestampToSeconds(c.start)
    const e = timestampToSeconds(c.end)
    return e >= win.start && s <= win.end
  })
  const trackCount = Math.max(1, Math.max(0, ...visibleClips.map(c => c.track ?? 0)) + 1)

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="w-full select-none" onKeyDown={ onKeyDown } tabIndex={ 0 } aria-label="Timeline">
      {/* Header: time + controls */ }

      <div className="flex items-center justify-between mb-2 text-sm text-white">
        <div className={'flex items-center gap-2 align-middle justify-center'}>
          <button
            className="px-2 py-1 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white"
            onClick={ () => {
              if (isPlaying) {
                setIsPlaying(false)
              } else {
                // Start playing from the current position up to the end
                if (currentSecond >= duration) {
                  // If already at end, do nothing (or seek to 0 if desired)
                  // onSeek(0)
                }
                setIsPlaying(true)
              }
            } }
            aria-label={ isPlaying ? "Pause" : "Play" }
          >{ isPlaying ? "Pause" : "Play" }
          </button>
          <div className="flex gap-1 text-sm font-light text-black dark:text-white">
            <div className="text-sm">{ formatBoundaryLabel(currentTime, endDate) }</div>
            <div className="text-sm text-black text-blue-500 dark:text-blue-400">{ '/' }</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{ formatBoundaryLabel(endDate, currentTime) }</div>
          </div>
        </div>
        <div className={ 'flex gap-2' }>

          <button
            className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            onClick={ cycleSpeed }
            aria-label={ `Playback speed ${ playSpeed.toFixed(1) }x (click to change)` }
            title="Change playback speed"
          >{ playSpeed.toFixed(1) }×
          </button>
          <button
            className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            onClick={ () => {
              const nextLen = clamp(windowLen * 0.7, minWindowSec, Math.min(maxWindow, duration))
              // Focus the zoom on the current handle (playhead) position within the visible window
              const focusT = clamp(currentSecond, win.start, win.end)
              const frac = windowLen > 0 ? (focusT - win.start) / windowLen : 0.5
              const start = clamp(focusT - frac * nextLen, 0, Math.max(0, duration - nextLen))
              setWin({start, end: start + nextLen})
            } }
            aria-label="Zoom in"
          >Zoom in
          </button>
          <button
            className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            onClick={ () => {
              const nextLen = clamp(windowLen / 0.7, minWindowSec, Math.min(maxWindow, duration))
              const center = win.start + windowLen / 2
              const start = clamp(center - nextLen / 2, 0, Math.max(0, duration - nextLen))
              setWin({start, end: start + nextLen})
            } }
            aria-label="Zoom out"
          >Zoom out
          </button>
          <button
            className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            onClick={ () => setWin({start: 0, end: Math.min(duration, maxWindow)}) }
            aria-label="Reset view"
          >Reset
          </button>
          {/*<button*/}
          {/*  className="px-2 py-1 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white"*/}
          {/*  onClick={ () => setIsShowingFullSlider(!isShowingFullSlider) }*/}
          {/*  aria-label="Reset view"*/}
          {/*>*/}
          {/*  { isShowingFullSlider ? (*/}
          {/*    <PanelBottomClose width={ 18 } height={ 18 }/>*/}
          {/*  ) : (*/}
          {/*    <PanelBottomOpen width={ 18 } height={ 18 }/>*/}
          {/*  ) }*/}
          {/*</button>*/}
        </div>
      </div>

      {/* Ruler (unit-aware) */ }
      <div
        ref={ containerRef }
        onWheel={ onWheel }
        className="relative w-full rounded-2xl bg-white dark:bg-gray-700 shadow-sm border border-slate-200 dark:border-gray-500 p-3"
      >
        {/* Ruler (unit-aware) */ }
        <div className="relative h-8 mb-2 overflow-hidden">
          { ticks.map((t) => (
            <div key={ t } className="absolute top-0 h-full"
                 style={ {left: `${ pct(t) }%`, transform: "translateX(-50%)"} }>
              <div className="w-px bg-slate-300 h-4"/>
              <div className="text-[10px] text-black dark:text-white font-mono mt-1 text-center min-w-[30px] -translate-x-1/2">
                { formatTickLabel(secondsToTimestamp(t), currentUnit) }
              </div>
            </div>
          )) }
          {/* Window edges */ }
          <div className="absolute inset-y-0 left-0 w-px bg-slate-200"/>
          <div className="absolute inset-y-0 right-0 w-px bg-slate-200"/>
        </div>

        {/* Tracks (clips) */ }
        { clips?.length > 0 && (
          <div className="grid gap-1 mb-3" style={ {gridTemplateRows: `repeat(${ trackCount }, 28px)`} }>
            { Array.from({length: trackCount}).map((_, r) => (
              <div key={ r } className="relative h-7 rounded-xl bg-slate-100 overflow-hidden">
                { visibleClips.filter(c => (c.track ?? 0) === r).map(c => {
                  const left = pct(timestampToSeconds(c.start))
                  const right = pct(timestampToSeconds(c.end))
                  const width = Math.max(1, right - left)
                  return (
                    <motion.div
                      key={ c.id }
                      className="absolute top-0 h-full rounded-xl border border-slate-300 text-[11px] px-2 flex items-center"
                      style={ {left: `${ left }%`, width: `${ width }%`, background: c.color ?? "#dbeafe"} }
                      initial={ {scaleY: 0.9, opacity: 0.8} }
                      animate={ {scaleY: 1, opacity: 1} }
                      transition={ {type: "spring", stiffness: 200, damping: 20} }
                      title={ `${ c.label ?? c.id } (${ formatDate(c.start) }–${ formatDate(c.end) })` }
                    >
                      <span className="truncate">{ c.label ?? c.id }</span>
                    </motion.div>
                  )
                }) }
              </div>
            )) }
          </div>
        ) }

        {/* Slider (playhead) */ }
        <div className="relative">
          <div className={ 'flex flex-col gap-2' }>
            {/*@ts-ignore*/ }
            <Slider { ...sliderProps } />
            { isShowingFullSlider && (
             <>
             </>
            ) }
          </div>
        </div>
      </div>
    </div>
  )
}