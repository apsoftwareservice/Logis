// Mirrors react-grid-layout's own pixel -> grid-unit math (see calcXY /
// calcGridColWidth in its calculateUtils) so a click position can be turned
// into a grid x/y without depending on that internal, untyped module.
// Keep this in sync with the <ResponsiveGridLayout> props in the dashboard
// page (rowHeight, margin, containerPadding all default to the same values).

export const GRID_ROW_HEIGHT = 50
export const GRID_MARGIN: [number, number] = [10, 10]

function getBreakpoint(breakpoints: Record<string, number>, containerWidth: number): string {
  const sorted = Object.keys(breakpoints).sort((a, b) => breakpoints[a] - breakpoints[b])
  let matching = sorted[0]
  for (const name of sorted) {
    if (containerWidth > breakpoints[name]) matching = name
  }
  return matching
}

export function pixelOffsetToGridPosition({
  containerWidth,
  offsetX,
  offsetY,
  breakpoints,
  cols,
  itemWidth,
  rowHeight = GRID_ROW_HEIGHT,
  margin = GRID_MARGIN,
}: {
  containerWidth: number
  offsetX: number
  offsetY: number
  breakpoints: Record<string, number>
  cols: Record<string, number>
  itemWidth: number
  rowHeight?: number
  margin?: [number, number]
}): { x: number; y: number } {
  const colCount = cols[getBreakpoint(breakpoints, containerWidth)]
  const [ marginX, marginY ] = margin
  // containerPadding defaults to margin when unset, as it is on our grid.
  const colWidth = (containerWidth - marginX * (colCount - 1) - marginX * 2) / colCount

  const x = Math.round((offsetX - marginX) / (colWidth + marginX))
  const y = Math.round((offsetY - marginY) / (rowHeight + marginY))

  return {
    x: Math.min(Math.max(x, 0), Math.max(colCount - itemWidth, 0)),
    y: Math.max(y, 0),
  }
}
