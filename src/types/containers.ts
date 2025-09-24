export enum ContainerType {
  graph = 'graph',
  table = 'table',
  metrics = 'metrics',
  // card = 'card',
  sales = 'sales',
  target = 'target',
  logs = 'logs',
  event = 'event'
}

export function DefaultContainerSize(type: ContainerType) {
  switch (type) {
    case ContainerType.graph: return {x: 0, y: 0, w: 6, h: 5}
    case ContainerType.metrics: return {x: 0, y: 0, w: 2, h: 2}
    case ContainerType.table: return {x: 0, y: 0, w: 8, h: 6}
    // case ContainerType.card: return {x: 0, y: 0, w: 6, h: 8}
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

// GUI

export interface StatisticsModel {
  xAxisParameterName: string
  yAxisParameterName: string
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

export type LogsModel = object