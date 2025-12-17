"use client"
import React, { createContext, RefObject, useCallback, useContext, useEffect, useRef, useState } from "react"
import { EventTypeIndex, LogEvent, Observer, TimelineEngine } from '@/core/engine'
import { detectFileFormat, InputType, isNewEvent } from '@/core/utils'
import { InputSource } from '@/core/sources/InputSource'
import { createFullJsonFileSource } from '@/core/sources/jsonFileSource'
import { createNdjsonFileSource } from '@/core/sources/ndJsonFileSource'
import { toast } from 'react-toastify'
import { Clip, Marker } from '@/components/timeline/TimeLine.types'
import { ContainerType, DashboardContainer, DefaultContainerSize, isPresetJSON } from '@/types/containers'
import { Layout } from 'react-grid-layout'
import { capitalize, discoverKeys, getNestedValue, toMs } from '@/lib/utils'
import { createEventSourceInput } from '@/core/sources/eventSource'
import * as process from 'process'
import { Option } from '@/components/ui/multiple-selector'
import {randomUUID} from "@/lib/crypto-util";

type DashboardContextType = {
  index?: RefObject<EventTypeIndex<unknown> | null>
  cachedDateKey?: RefObject<string | null>
  timeframe: { start?: number, end?: number } | undefined
  clips: Clip[]
  setClips: React.Dispatch<React.SetStateAction<Clip[]>>

  logs: object[]
  setLogs: React.Dispatch<React.SetStateAction<object[]>>

  lockGrid: boolean
  setLockGrid: React.Dispatch<React.SetStateAction<boolean>>

  markers: Marker[]
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>

  containers: DashboardContainer<object>[]
  setContainers: React.Dispatch<React.SetStateAction<DashboardContainer<object>[]>>

  currentTimestamp: number
  setCurrentTimestamp: React.Dispatch<React.SetStateAction<number>>

  isRegisteredObserver: (id: string) => boolean
  registerObserver: (observer: Observer) => void
  parseFiles: (files: File[]) => Promise<void>

  updateContainerTitle: (container: DashboardContainer<object>, title: string) => void
  updateContainerSize: (layout: Layout) => void
  removeContainer: (container: DashboardContainer<object>) => void

  followLogs: boolean
  setFollowLogs: React.Dispatch<React.SetStateAction<boolean>>

  sessionId?: string
  isLiveSession: boolean
  handleLiveSessionStateChange: (state: boolean, customId?: string) => void

  searchValues: Option[]
  setSearchValues: React.Dispatch<React.SetStateAction<Option[]>>
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

  const [ searchValues, setSearchValues ] = useState<Option[]>([])
  const [ sessionId, setSessionId ] = useState<string>()
  const [ isLiveSession, setIsLiveSession ] = useState(false)
  const [ logs, setLogs ] = useState<object[]>([])
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
  const [ timeframe, setTimeframe ] = useState<{ start?: number, end?: number }>()
  const [ followLogs, setFollowLogs ] = useState(false)

  const pendingTsRef = useRef<number | null>(null)
  const scheduledRef = useRef(false)

  const baseUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : '';

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

  // Helper to register live session and get token
  async function registerLiveSession(key: string): Promise<{ token: string; reused: boolean }> {
    const res = await fetch(`${ process.env.NEXT_PUBLIC_BASE_URL ?? baseUrl }/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({key})
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Register failed (${ res.status }): ${ text || res.statusText }`)
    }
    return res.json()
  }

  async function handleLiveSessionStateChange(state: boolean, customId?: string) {
    if (engine.current && engine.current?.source.type !== InputType.stream) {
      toast.error('Refresh the page and start with Live Session')
      return
    }

    setIsLiveSession(state)

    if (state) {
      if (engine.current) {
        engine.current.source.start(handleSourceEvents)
      } else {
        setTimeframe({start: 0, end: 0})
        try {
          const {token, reused} = await registerLiveSession(customId ?? sessionId ?? randomUUID())
          setSessionId(customId ?? token)
          await startEngineWithSource(createEventSourceInput(`${ process.env.NEXT_PUBLIC_BASE_URL ?? baseUrl }/stream?token=${ token }`))
        } catch (e: any) {
          toast.error(`${ e }`)
          setIsLiveSession(false)
        }
      }
    } else {
      if (engine.current?.source) {
        engine.current.source.stop?.()
        toast.info('Live Session Stopped')
      }
      setFollowLogs(false)
    }
  }

  const handleFirstEventParsing = useCallback((events: LogEvent[]) => {
    index.current = EventTypeIndex.fromSortedBatch(events)
    const {dateKey, messageKey} = discoverKeys(events[0])

    if (dateKey && messageKey) {
      cachedDateKey.current = dateKey
      cachedMessageKey.current = messageKey
      const startDate = getNestedValue(events[0], dateKey)
      const endDate = getNestedValue(events[events.length - 1], dateKey)
      const start = toMs(startDate)
      const end = toMs(endDate)

      if (start !== null && end !== null) {
        setTimeframe({start, end})
        setCurrentTimestamp(start)
        addDefaultLoggerContainer()
      } else {
        toast.error('Failed reading logs timestamp')
      }
    }
  }, [])

  const handleSourceEvents = useCallback((events: LogEvent[]) => {
    if (!engine?.current?.source) {
      toast.error('Engine not found')
    }

    if (!events || events.length === 0) {
      console.warn(`no events from input source ${ engine.current?.source.type }`)
      return
    }

    if (!index.current) {
      handleFirstEventParsing(events)
    }

    setLogs(prev => prev.concat([ ...events ]))

    if (engine?.current?.source.type === InputType.stream) {
      events.forEach(event => index.current?.appendLiveSorted(event, cachedDateKey.current, cachedMessageKey.current))

      const lastEndDate = getNestedValue(events[events.length - 1], cachedDateKey.current)
      const end = toMs(lastEndDate)

      if (end !== null) {
        setTimeframe(prev => {
          return {
            ...prev,
            end
          }
        })
      }
    }
  }, [ handleFirstEventParsing ])

  const startEngineWithSource = useCallback(async (source: InputSource) => {
    engine.current = new TimelineEngine(source)
    setFollowLogs(source.type === InputType.stream)
    engine.current.source.start(handleSourceEvents)
  }, [ handleSourceEvents ])

  function appendNewEventsFromSource(source: InputSource) {
    source.start((events) => {
      if (!events || events.length <= 0) {
        toast.error('No logs found')
        source.stop?.()
        return
      }

      const {dateKey, messageKey} = discoverKeys(events[0])

      if (dateKey !== cachedDateKey.current || messageKey !== cachedMessageKey.current) {
        toast.error(`The date key "${ dateKey }" mast match the already existing key "${ cachedDateKey }", same for the message key`)
        source.stop?.()
        return
      }

      index.current?.appendAndSort(events, cachedDateKey.current, cachedMessageKey.current)
      setLogs(prev => {
        const newEvents: LogEvent[] = events.filter(event => isNewEvent(event, dateKey, messageKey, index.current))
        return prev.concat(newEvents)
      })

      source.stop?.()
    })
  }

  useEffect(() => {
    const tempMarkers: Marker[] = []

    if (searchValues.length > 0) {
      searchValues.forEach(option => {
        const value = option.value
        let buckets = []

        const bucket = index.current?.getBucket(value)

        if (bucket) {
          buckets = [ bucket ]
        } else {
          buckets = index.current?.getBucketsIncludingType(value) ?? []
        }
        tempMarkers.push(...buckets
          .map(bucket =>
            Array.from(bucket.timestampsMs).map(timestamp => ({
              id: randomUUID(),
              time: timestamp,
              color: option.color,
              label: value
            }))
          )
          .flat())
      })
    }

    setMarkers(tempMarkers)
  }, [ searchValues ])

  useEffect(() => {
    requestSeek(currentTimestamp)
  }, [ currentTimestamp, requestSeek ])

  useEffect(() => {
    if (followLogs && timeframe?.end != null) {
      setCurrentTimestamp(timeframe.end)
    }
  }, [ followLogs, timeframe?.end, setCurrentTimestamp ])

  function isRegisteredObserver(id: string): boolean {
    return engine.current?.isRegistered(id) ?? false
  }

  function registerObserver(observer: Observer) {
    engine.current?.register(observer)
  }

  async function parseFiles(files: File[]) {
    files.forEach(file => {
      try {
        parseLogFile(file)
      } catch (error) {
        toast.error(`${ error }`)
      }
    })
  }

  async function parseLogFile(file: File) {
    const format = await detectFileFormat(file)
    let source: InputSource

    switch (format) {
      case InputType.json: {
        const text = await file.text()
        const json = JSON.parse(text)

        if (isPresetJSON(json)) {
          setContainers(json)
          toast.success(`Loaded preset ${file.name}`)
          return
        }

        source = createFullJsonFileSource(json)
        break
      }

      case InputType.ndjson:
        source = createNdjsonFileSource(file)
        break

      default:
        // fallback: try full JSON then NDJSON by reading text
        const text = await file.text()
        try {
          const parsed = JSON.parse(text)
          source = {
            type: InputType.unknown,
            start: (onEvents) => onEvents(parsed)
          }
        } catch {
          // treat as NDJSON lines
          source = {
            type: InputType.ndjson,
            start: (onEvents) => {
              const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
              const parsed = lines.map(l => JSON.parse(l) as LogEvent)
              onEvents(parsed)
            }
          }
        }
    }

    if (engine.current) {
      if (engine.current.source !== source) {
        appendNewEventsFromSource(source)
      }
    } else {
      await startEngineWithSource(source)
    }
  }

  function addDefaultLoggerContainer() {
    setContainers(containers => containers.concat({
      id: randomUUID(),
      title: capitalize(ContainerType.logs),
      type: ContainerType.logs,
      gridLayout: DefaultContainerSize(ContainerType.logs),
      data: {}
    }))
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
        parseFiles,
        index,
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
        removeContainer,
        logs,
        cachedDateKey,
        followLogs,
        setFollowLogs,
        isLiveSession,
        handleLiveSessionStateChange,
        sessionId,
        setSearchValues,
        searchValues,
        setLogs,
        isRegisteredObserver
      } }
    >
      { children }
    </DashboardContext.Provider>
  )
}
