export enum ContainerType {
  graph = 'graph',
  table = 'table',
  event = 'event',
  target = 'target',
  state = 'state',
  logs = 'logs',
  statefulEvent = 'statefulEvent',
  action = 'action',
}

export const DEFAULT_TARGET_MAX_VALUE = 100

// Grid units below this floor stop fitting the container chrome (title, three-dot
// menu) at the current rowHeight/margin/padding - see page.tsx and BaseView.tsx.
export const MIN_CONTAINER_W = 1
export const MIN_CONTAINER_H = 3

export const CONTAINER_TYPE_LABELS: Record<ContainerType, string> = {
  [ContainerType.graph]: 'Graph',
  [ContainerType.table]: 'Table',
  [ContainerType.event]: 'Event',
  [ContainerType.target]: 'Target',
  [ContainerType.state]: 'State',
  [ContainerType.logs]: 'Logs',
  [ContainerType.statefulEvent]: 'Stateful Event',
  [ContainerType.action]: 'Action',
}

export const CONTAINER_TYPE_DESCRIPTIONS: Record<ContainerType, string> = {
  [ContainerType.graph]: 'Plots one or more event values over time so trends are easy to spot.',
  [ContainerType.table]: 'Shows incoming event records in a sortable table for quick inspection.',
  [ContainerType.event]: 'Displays the latest occurrence of a selected event.',
  [ContainerType.target]: 'Tracks a numeric value against a maximum and shows progress as a gauge.',
  [ContainerType.state]: 'Highlights the current value of a selected event field.',
  [ContainerType.logs]: 'Streams collected logs in one scrollable view.',
  [ContainerType.statefulEvent]: 'Marks whether a state is active based on separate start and stop events.',
  [ContainerType.action]: 'Sends an HTTP request so the dashboard can trigger an external action.',
}

export function getContainerTypeLabel(type: ContainerType) {
  return CONTAINER_TYPE_LABELS[type]
}

export function getContainerTypeDescription(type: ContainerType) {
  return CONTAINER_TYPE_DESCRIPTIONS[type]
}

// w and h are in grid units at the cols/rowHeight/margin set in page.tsx. Both
// axes were doubled there for finer resize steps, so both are doubled again here
// to keep each type's default at roughly its old physical size - except `state`,
// which - unlike every other type - renders nothing but a single centered value
// with no chart, table, or animation, so its default sits right at the
// MIN_CONTAINER_W/H floor instead of a preserved, oversized default.
export function DefaultContainerSize(type: ContainerType) {
  switch (type) {
    case ContainerType.graph: return {x: 0, y: 0, w: 12, h: 10}
    case ContainerType.state: return {x: 0, y: 0, w: MIN_CONTAINER_W, h: MIN_CONTAINER_H}
    case ContainerType.table: return {x: 0, y: 0, w: 16, h: 12}
    case ContainerType.target: return {x: 0, y: 0, w: 10, h: 8}
    case ContainerType.logs: return {x: 0, y: 0, w: 38, h: 16}
    case ContainerType.event: return {x: 0, y: 0, w: 4, h: 6}
    case ContainerType.statefulEvent: return {x: 0, y: 0, w: 8, h: 8}
    case ContainerType.action: return {x: 0, y: 0, w: 4, h: 6}
  }
}

export type DashboardContainer<T extends object> = {
  id: string
  title: string
  type: ContainerType
  gridLayout: {x: number, y: number, w: number, h: number}
  data: T
}

export function isPresetJSON(value: any): value is DashboardContainer<object>[] {
  if (!Array.isArray(value)) return false;
  return value.every(item =>
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.type === 'string' &&
    typeof item.gridLayout === 'object' &&
    typeof item.gridLayout.x === 'number' &&
    typeof item.gridLayout.y === 'number' &&
    typeof item.gridLayout.w === 'number' &&
    typeof item.gridLayout.h === 'number' &&
    typeof item.data === 'object'
  );
}


// GUI

export type Series = { id: string; event: string; xAxisParameterName: string; yAxisParameterName: string }

export interface StatisticsModel {
  series: Series[]
}

export interface TableModel {
  event: string
}

export interface TargetModel {
  event: string
  parameterKey: string
  maxValue: number
}

export function DefaultContainerData(type: ContainerType): object {
  switch (type) {
    case ContainerType.target:
      return {
        event: '',
        parameterKey: '',
        maxValue: DEFAULT_TARGET_MAX_VALUE
      }
    default:
      return {}
  }
}

export interface EventModel {
  event: string
}

export interface StatefulEventModel {
  startEvent: string
  stopEvent: string
  parameterKey: string
}

export interface StateModel {
  event: string
  parameterKey: string
}

export interface ActionModel {
  method: string
  url: string
  headers: Array<{ key: string; value: string }>
  params: Array<{ key: string; value: string }>
  body: string
}

export type LogsModel = object
