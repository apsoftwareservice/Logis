export enum ContainerType {
  graph = 'graph',
  table = 'table'
}

export type DashboardContainer<T extends object = {}> = {
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