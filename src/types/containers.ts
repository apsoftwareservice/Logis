export enum ContainerType {
  graph = 'graph',
  table = 'table',
  event = 'event',
  target = 'target',
  state = 'state',
  sales = 'sales',
  logs = 'logs',
}

export function DefaultContainerSize(type: ContainerType) {
  switch (type) {
    case ContainerType.graph: return {x: 0, y: 0, w: 6, h: 5}
    case ContainerType.state: return {x: 0, y: 0, w: 2, h: 2}
    case ContainerType.table: return {x: 0, y: 0, w: 8, h: 6}
    case ContainerType.sales: return {x: 0, y: 0, w: 6, h: 5}
    case ContainerType.target: return {x: 0, y: 0, w: 5, h: 4}
    case ContainerType.logs: return {x: 0, y: 0, w: 19, h: 8}
    case ContainerType.event: return {x: 0, y: 0, w: 2, h: 3}
  }
}

export type DashboardContainer<T extends object> = {
  id: string
  title: string
  type: ContainerType
  event: string
  gridLayout: {x: number, y: number, w: number, h: number}
  data: T
}

export function isPresetJSON(value: any): value is DashboardContainer<object>[] {
  if (!Array.isArray(value)) return false;
  return value.every(item =>
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.type === 'string' &&
    typeof item.event === 'string' &&
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
  columns: string[]
}

export interface TargetModel {
  value: string
  maxValue: number
}

export interface EventModel {
  lastState: boolean
}

export interface StateModel {
  parameterKey: string
}

export type LogsModel = object