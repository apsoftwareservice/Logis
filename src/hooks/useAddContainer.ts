"use client"

import { useDashboard } from "@/context/DashboardContext"
import {
  ContainerType,
  DefaultContainerData,
  DefaultContainerSize,
  getContainerTypeDescription,
  getContainerTypeLabel,
} from "@/types/containers"
import { randomUUID } from "@/lib/crypto-util"

export function useAddContainer() {
  const { setContainers } = useDashboard()

  const options = Object.keys(ContainerType)

  const addContainer = (value: string, gridPosition?: { x: number, y: number }) => {
    const type = value as ContainerType
    setContainers(containers => containers.concat({
      id: randomUUID(),
      title: getContainerTypeLabel(type),
      type,
      gridLayout: { ...DefaultContainerSize(type), ...gridPosition },
      data: DefaultContainerData(type)
    }))
  }

  const getOptionLabel = (option: string) => getContainerTypeLabel(option as ContainerType)
  const getOptionDescription = (option: string) => getContainerTypeDescription(option as ContainerType)

  return { options, addContainer, getOptionLabel, getOptionDescription }
}
