"use client"
import React, { createContext, RefObject, useCallback, useContext, useEffect, useRef, useState } from "react"
import { EventTypeIndex, LogEvent, Observer, TimelineEngine } from '@/core/engine'
import { detectFileFormat, FileFormat } from '@/core/parsers/detectFileFormat'
import { InputSource } from '@/core/sources/InputSource'
import { createFullJsonFileSource } from '@/core/parsers/fullJson'
import { createNdjsonFileSource } from '@/core/parsers/ndjson'
import { toast } from 'react-toastify'
import { Clip, Marker } from '@/components/timeRange/TimeLine.types'
import {ContainerType, DashboardContainer, DefaultContainerSize} from '@/types/containers'
import { Layout } from 'react-grid-layout'
import {capitalize, discoverKeys, getNestedValue, toMs} from '@/lib/utils'

type DashboardContextType = {
  index?: RefObject<EventTypeIndex<unknown> | null>
  cachedDateKey?: RefObject<string| null>
  timeframe: { start: number, end: number }
  clips: Clip[]
  setClips: React.Dispatch<React.SetStateAction<Clip[]>>

  logs: object[]

  lockGrid: boolean
  setLockGrid: React.Dispatch<React.SetStateAction<boolean>>

  markers: Marker[]
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>

  containers: DashboardContainer<object>[]
  setContainers: React.Dispatch<React.SetStateAction<DashboardContainer<object>[]>>

  currentTimestamp: number
  setCurrentTimestamp: React.Dispatch<React.SetStateAction<number>>

  registerObserver: (observer: Observer) => void
  parseLogFile: (file: File) => Promise<void>

  handleOnSearch: (value: string) => void
  updateContainerTitle: (container: DashboardContainer<object>, title: string) => void
  updateContainerSize: (layout: Layout) => void
  removeContainer: (container: DashboardContainer<object>) => void

  startEngineWithSource: (source: InputSource, follow: boolean) => Promise<void>

  followLogs: boolean
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export const useDashboard = () => {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {

  const [logs, setLogs] = useState<object[]>([])
  const [ containers, setContainers ] = useState<DashboardContainer<object>[]>([])
  const [ lockGrid, setLockGrid ] = useState(true)
  const [ currentTimestamp, setCurrentTimestamp ] = useState(0)
  const [ clips, setClips ] = useState<Clip[]>([]
    // { id: "A", start: 0, end: 22.5, track: 0, label: "Intro", color: "#fde68a" },
    // { id: "B", start: 10, end: 42, track: 1, label: "Interview", color: "#bbf7d0" },
    // { id: "C", start: 44, end: 70, track: 0, label: "B-Roll", color: "#bfdbfe" },
    // { id: "D", start: 80, end: 110, track: 1, label: "Overlay", color: "#fecaca" }]
  )
  const [ markers, setMarkers ] = useState<Marker[]>([])
  const cachedDateKey = useRef<string>('')
  const cachedMessageKey = useRef<string>('')
  const index = useRef<EventTypeIndex>(null)
  const engine = useRef<TimelineEngine>(null)
  const [ timeframe, setTimeframe ] = useState<{ start: number, end: number }>({start: 0, end: 1})
  const [followLogs, setFollowLogs] = useState(false)

  const pendingTsRef = useRef<number | null>(null)
  const scheduledRef = useRef(false)

  const requestSeek = useCallback((timestamp: number) => {
    pendingTsRef.current = timestamp
    if (scheduledRef.current) return
    scheduledRef.current = true
    requestAnimationFrame(() => {
      scheduledRef.current = false
      const ts = pendingTsRef.current
      if (ts == null) return
      engine.current?.moveTo(ts)
      pendingTsRef.current = null
    })
  }, [])

  useEffect(() => {
    requestSeek(currentTimestamp)
  }, [ currentTimestamp, requestSeek ])

  function registerObserver(observer: Observer) {
    engine.current?.register(observer)
  }

  async function parseLogFile(file: File) {
    try {
      const format = await detectFileFormat(file)
      let source: InputSource

      switch (format) {
        case FileFormat.json:
          source = createFullJsonFileSource(file)
          break

        case FileFormat.ndjson:
          source = createNdjsonFileSource(file)
          break

        default:
          // fallback: try full JSON then NDJSON by reading text
          const text = await file.text()
          try {
            const parsed = JSON.parse(text)
            source = {
              name: "fallback:parsed",
              start: (onEvents) => onEvents(parsed)
            }
          } catch {
            // treat as NDJSON lines
            source = {
              name: "fallback:ndjson",
              start: (onEvents) => {
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
                const parsed = lines.map(l => JSON.parse(l) as LogEvent)
                onEvents(parsed)
              }
            }
          }
      }

      await startEngineWithSource(source, false)
    } catch (error) {
      toast.error(`${ error }`)
    }
  }

  async function startEngineWithSource(source: InputSource, follow: boolean) {
    await source.start(async (events) => {
      if (!events || events.length === 0) {
        console.warn("no events from input source", source.name)
        return
      }

      setLogs(prev => prev.concat([...events]))

      if (engine.current) {
        events.forEach(event => index.current?.appendLiveSorted(event, cachedDateKey.current, cachedMessageKey.current))
        if (follow) {
          const lastVal = getNestedValue(events[events.length - 1], cachedDateKey.current)
          const end = toMs(lastVal)

          if (end !== null && timeframe.start > 0) {
            setTimeframe({start: timeframe.start, end})
            setCurrentTimestamp(end)
          }
        }
      } else {
        index.current = EventTypeIndex.fromSortedBatch(events)
        engine.current = new TimelineEngine(index.current)
        const {dateKey, messageKey} = discoverKeys(events[0])

        if (dateKey && messageKey) {
          cachedDateKey.current = dateKey
          cachedMessageKey.current = messageKey
          const firstVal = getNestedValue(events[0], dateKey)
          const lastVal = getNestedValue(events[events.length - 1], dateKey)
          const start = toMs(firstVal)
          const end = toMs(lastVal)

          if (start !== null && end !== null) {
            setTimeframe({start, end})
            setCurrentTimestamp(start)
            setFollowLogs(follow)
          } else {
            toast.error('Failed reading logs timestamp')
          }

          addDefaultLoggerContainer()
        }
      }
    })
  }

  function addDefaultLoggerContainer() {
    setContainers(containers => containers.concat({
      id: crypto.randomUUID(),
      title: capitalize(ContainerType.logs),
      type: ContainerType.logs,
      gridLayout: DefaultContainerSize(ContainerType.logs),
      event: '',
      data: {}
    }))
  }

  function handleOnSearch(value: string) {
    let buckets = []

    const bucket = index.current?.getBucket(value)

    if (bucket) {
      buckets = [ bucket ]
    } else {
      buckets = index.current?.getBucketsIncludingType(value) ?? []
    }

    const markers: Marker[] = buckets
      .map(bucket =>
        Array.from(bucket.timestampsMs).map(timestamp => ({
          id: crypto.randomUUID(),
          time: timestamp,
          color: 'red',
          label: value
        }))
      )
      .flat()

    setMarkers(markers)
  }

  function updateContainerTitle(container: DashboardContainer<object>, title: string) {
    setContainers(containers => containers.map(_container => {
      if (_container.id === container.id) {
        return {
          ..._container,
          title
        }
      }
      return _container
    }))
  }

  function updateContainerSize(layout: Layout) {
    setContainers(containers => containers.map(_container => {
      if (_container.id === layout.i) {
        return {
          ..._container,
          gridLayout: {
            ..._container.gridLayout,
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h
          }
        }
      }
      return _container
    }))
  }

  function removeContainer(container: DashboardContainer<any>) {
    setContainers(containers => containers.filter(_container => _container.id !== container.id))
  }

  return (
    <DashboardContext.Provider
      value={ {
        currentTimestamp,
        setCurrentTimestamp,
        timeframe,
        registerObserver,
        parseLogFile,
        index,
        handleOnSearch,
        clips,
        markers,
        setClips,
        setMarkers,
        containers,
        setContainers,
        lockGrid,
        setLockGrid,
        updateContainerTitle,
        updateContainerSize,
        startEngineWithSource,
        removeContainer,
        logs,
        cachedDateKey,
        followLogs
      } }
    >
      { children }
    </DashboardContext.Provider>
  )
}
