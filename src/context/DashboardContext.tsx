"use client"
import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { EventTypeIndex, LogEvent, Observer, TimelineEngine } from '@/parsers/engine'
import { Product } from '@/components/dashboard/RecentOrders'
import { detectFileFormat } from '@/parsers/logs/detectFileFormat'
import { InputSource } from '@/parsers/logs/InputSource'
import { createFullJsonFileSource } from '@/parsers/logs/fullJson'
import { createNdjsonFileSource } from '@/parsers/logs/ndjson'

const inputLogs = [
  {"level": "info", "message": "Server started", "timestamp": "2025-09-01T08:00:00.000", "payload": {}},
  {"level": "info", "message": "Connected to database", "timestamp": "2025-09-01T08:00:01.000", "payload": {}},
  {"level": "debug", "message": "Cache warmup started", "timestamp": "2025-09-01T08:00:02.000", "payload": {}},
  {"level": "info", "message": "Cache warmup completed", "timestamp": "2025-09-01T08:00:03.000", "payload": {}},
  {
    "level": "info",
    "message": "User registered",
    "timestamp": "2025-09-01T08:01:00.000",
    "payload": {
      "userId": "u-1001",
      "country": "US"
    }
  },
  {
    "level": "info",
    "message": "User registered",
    "timestamp": "2025-09-01T08:02:00.000",
    "payload": {
      "userId": "u-1002",
      "country": "UK"
    }
  },
  {
    "level": "info",
    "message": "User registered",
    "timestamp": "2025-09-01T08:03:00.000",
    "payload": {
      "userId": "u-1003",
      "country": "CA"
    }
  },
  {
    "level": "info",
    "message": "Order created",
    "timestamp": "2025-09-01T08:04:00.000",
    "payload": {
      id: 1,
      name: "MacBook Pro 13”",
      variants: "2 Variants",
      category: "Laptop",
      price: "$2399.00",
      status: "Delivered",
      image: "/images/product/product-01.jpg" // Replace with actual image URL
    }
  },
  {
    "level": "info",
    "message": "Order created",
    "timestamp": "2025-09-01T08:05:00.000",
    "payload": {
      id: 2,
      name: "Apple Watch Ultra",
      variants: "1 Variant",
      category: "Watch",
      price: "$879.00",
      status: "Pending",
      image: "/images/product/product-02.jpg" // Replace with actual image URL
    }
  },
  {
    "level": "error",
    "message": "Payment failed",
    "timestamp": "2025-09-01T08:06:00.000",
    "payload": {
      "orderId": "o-2003",
      "userId": "u-1003",
      "amount": 120.00,
      "reason": "Card declined"
    }
  },
  {
    "level": "warn",
    "message": "Retrying payment",
    "timestamp": "2025-09-01T08:06:05.000",
    "payload": {"orderId": "o-2003"}
  },
  {
    "level": "info",
    "message": "Payment succeeded",
    "timestamp": "2025-09-01T08:06:10.000",
    "payload": {"orderId": "o-2003"}
  },
  {
    "level": "info",
    "message": "Order shipped",
    "timestamp": "2025-09-01T08:07:00.000",
    "payload": {
      "orderId": "o-2002",
      "carrier": "UPS"
    }
  },
  {
    "level": "info",
    "message": "Order delivered",
    "timestamp": "2025-09-01T08:08:00.000",
    "payload": {"orderId": "o-2002"}
  },
  {
    "level": "info",
    "message": "Monthly target updated",
    "timestamp": "2025-09-01T08:10:00.000",
    "payload": {"target": 50000}
  },
  {
    "level": "info",
    "message": "Revenue recorded",
    "timestamp": "2025-09-01T08:11:00.000",
    "payload": {"amount": 2399.00}
  },
  {
    "level": "debug",
    "message": "Background job started",
    "timestamp": "2025-09-01T08:12:00.000",
    "payload": {"jobId": "job-01"}
  },
  {
    "level": "info",
    "message": "Background job completed",
    "timestamp": "2025-09-01T08:12:01.000",
    "payload": {
      "jobId": "job-01",
      "durationMs": 350
    }
  },
  {"level": "info", "message": "User login", "timestamp": "2025-09-01T08:13:00.000", "payload": {"userId": "u-1001"}},
  {"level": "info", "message": "User logout", "timestamp": "2025-09-01T08:15:00.000", "payload": {"userId": "u-1001"}},
  {"level": "info", "message": "User login", "timestamp": "2025-09-01T08:16:00.000", "payload": {"userId": "u-1002"}},
  {
    "level": "warn",
    "message": "Unusual traffic detected",
    "timestamp": "2025-09-01T08:17:00.000",
    "payload": {
      "ip": "192.168.1.50"
    }
  },
  {
    "level": "info",
    "message": "Customer demographics updated",
    "timestamp": "2025-09-01T08:18:00.000",
    "payload": {
      "country": "US",
      "count": 1500
    }
  },
  {
    "level": "info",
    "message": "Customer demographics updated",
    "timestamp": "2025-09-01T08:18:05.000",
    "payload": {
      "country": "UK",
      "count": 900
    }
  },
  {
    "level": "info",
    "message": "Customer demographics updated",
    "timestamp": "2025-09-01T08:18:10.000",
    "payload": {
      "country": "CA",
      "count": 600
    }
  },
  {
    "level": "info",
    "message": "Customer demographics updated",
    "timestamp": "2025-09-01T08:18:15.000",
    "payload": {
      "country": "DE",
      "count": 400
    }
  },
  {
    "level": "info",
    "message": "Customer demographics updated",
    "timestamp": "2025-09-01T08:18:20.000",
    "payload": {
      "country": "IN",
      "count": 382
    }
  },
  {
    "level": "info",
    "message": "Order created",
    "timestamp": "2025-09-01T08:20:00.000",
    "payload": {
      id: 3,
      name: "iPhone 15 Pro Max",
      variants: "2 Variants",
      category: "SmartPhone",
      price: "$1869.00",
      status: "Delivered",
      image: "/images/product/product-03.jpg" // Replace with actual image URL
    }
  },
  {
    "level": "info",
    "message": "Order created",
    "timestamp": "2025-09-01T08:21:00.000",
    "payload": {
      id: 4,
      name: "iPad Pro 3rd Gen",
      variants: "2 Variants",
      category: "Electronics",
      price: "$1699.00",
      status: "Canceled",
      image: "/images/product/product-04.jpg" // Replace with actual image URL
    }
  },
  {
    "level": "info",
    "message": "Order created",
    "timestamp": "2025-09-01T08:22:00.000",
    "payload": {
      id: 5,
      name: "AirPods Pro 2nd Gen",
      variants: "1 Variant",
      category: "Accessories",
      price: "$240.00",
      status: "Delivered",
      image: "/images/product/product-05.jpg" // Replace with actual image URL
    }
  },
  {
    "level": "error",
    "message": "Order canceled",
    "timestamp": "2025-09-01T08:23:00.000",
    "payload": {
      "orderId": "o-2005",
      "reason": "Inventory out of stock"
    }
  }
]

type DashboardContextType = {
  logIndex?:  EventTypeIndex<unknown>
  timeframe: { start: number, end: number }

  currentTimestamp: number
  setCurrentTimestamp: React.Dispatch<React.SetStateAction<number>>

  registerObserver: (observer: Observer) => void
  parseLogFile: (file: File) => Promise<void>
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

  const [ currentTimestamp, setCurrentTimestamp ] = useState(0)

  const [logIndex, setLogIndex] = useState<EventTypeIndex>()
  const engine = useRef<TimelineEngine>(null)
  const [ timeframe, setTimeframe ] = useState<{ start: number, end: number }>({start: 0, end: 1})

  let pendingTs: number | null = null
  let scheduled = false

  useEffect(() => {
    requestSeek(currentTimestamp)
  }, [ currentTimestamp ])

  function registerObserver(observer: Observer) {
    engine.current?.register(observer)
  }

  async function parseLogFile(file: File) {
    try {
      const format = await detectFileFormat(file)
      let source: InputSource

      if (format === "full-json") {
        source = createFullJsonFileSource(file)
      } else if (format === "ndjson") {
        source = createNdjsonFileSource(file)
      } else {
        // fallback: try full JSON then NDJSON by reading text
        const text = await file.text()
        try {
          const parsed = JSON.parse(text) as LogEvent[]
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

      // start the source — expect it to call `onEvents` with an array of LogEvent
      await source.start(async (events) => {
        if (!events || events.length === 0) {
          console.warn("no events from input source", source.name)
          return
        }

        const index = EventTypeIndex.fromSortedBatch(events)
        engine.current = new TimelineEngine(index)
        setLogIndex(index)

        setTimeframe({start: new Date(events[0].timestamp).valueOf(), end: new Date(events[events.length - 1].timestamp).valueOf()})
      })

    } catch (err) {
      console.error("parseLogFile error", err)
    }
  }

  function requestSeek(timestamp: number) {
    pendingTs = timestamp
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      if (pendingTs == null) return
      engine.current?.moveTo(pendingTs)
      pendingTs = null
    })
  }

  return (
    <DashboardContext.Provider
      value={ {
        currentTimestamp,
        setCurrentTimestamp,
        timeframe,
        registerObserver,
        parseLogFile,
        logIndex
      } }
    >
      { children }
    </DashboardContext.Provider>
  )
}
