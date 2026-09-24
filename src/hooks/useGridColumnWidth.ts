"use client"

import { useLayoutEffect, useState } from "react"

function getBreakpoint(breakpoints: Record<string, number>, width: number): string {
  const sorted = Object.keys(breakpoints).sort((a, b) => breakpoints[a] - breakpoints[b])
  let matching = sorted[0]
  for (const name of sorted) {
    if (width > breakpoints[name]) matching = name
  }
  return matching
}

export type GridColumnMetrics = { colWidth: number, cols: number, containerWidth: number, breakpoint: string }

/**
 * Tracks the live pixel width of one grid column (and the active column count)
 * at whatever breakpoint is currently active.
 *
 * Returns a ref callback to attach to the grid wrapper element, plus the
 * measured metrics (null until the node exists and has been measured).
 *
 * This takes a node via a state-backed ref callback rather than a plain
 * RefObject, on purpose: a plain ref's `.current` can change (e.g. the wrapper
 * only renders once containers exist) without triggering a re-render, so an
 * effect keyed on stable deps only ever sees the ref's *first* value and never
 * gets a chance to run again once the real node shows up. Storing the node in
 * state makes "the node just mounted" itself a dependency the effect reacts to.
 */
export function useGridColumnWidth(
  cols: Record<string, number>,
  breakpoints: Record<string, number>,
  margin: [ number, number ],
): [ (node: HTMLElement | null) => void, GridColumnMetrics | null ] {
  const [ node, setNode ] = useState<HTMLElement | null>(null)
  const [ metrics, setMetrics ] = useState<GridColumnMetrics | null>(null)

  useLayoutEffect(() => {
    if (!node) return

    const update = () => {
      const width = node.getBoundingClientRect().width
      if (!width) return
      const breakpoint = getBreakpoint(breakpoints, width)
      const colCount = cols[breakpoint]
      const [ marginX ] = margin
      // Mirrors react-grid-layout's own calcGridColWidth: containerPadding
      // defaults to margin when unset, as it is on our grid.
      const colWidth = (width - marginX * (colCount - 1) - marginX * 2) / colCount
      setMetrics({ colWidth, cols: colCount, containerWidth: width, breakpoint })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ node, cols, breakpoints, margin ])

  return [ setNode, metrics ]
}
