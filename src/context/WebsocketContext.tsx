"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { WebSocketProvider } from '@/providers/WebsocketProvider'
import { ScriptProps } from 'next/script'

export const enum ConnectionStatus {
  connected,
  disconnected
}

export const enum ReachabilityStatus {
  internetReachable,
  noInternet
}

type WebSocketContextType = {
  reachabilityStatus: ReachabilityStatus
  refreshWebsocketConnection: () => Promise<ConnectionStatus | undefined>

  openConnection: () => void
  closeWebSocket: () => void

  isSyncingAfterDisconnect: boolean
  isReconnectingWebSocket: boolean

  socketConnectionStatus?: ConnectionStatus
  setSocketConnectionStatus: (_: ConnectionStatus) => void
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)
let pingInterval: NodeJS.Timeout | undefined

export const WebSocketContextProvider = ({children}: ScriptProps) => {

  const [ reachabilityStatus, setReachabilityStatus ] = useState<ReachabilityStatus>(ReachabilityStatus.internetReachable)

  const ws = useRef<WebSocket | undefined>(undefined)
  const [ socketConnectionStatus, setSocketConnectionStatus ] = useState<ConnectionStatus>()
  const [ isSyncingAfterDisconnect, setIsSyncingAfterDisconnect ] = useState(false)
  const [ isReconnectingWebSocket, setIsReconnectingWebSocket ] = useState(false)
  const websocketConnectionClosedAtTimestamp = useRef<number | null>(null)
  const lastCommunicationTimestamp = useRef<number>(Date.now())

  const lastReconnectTime = useRef(0)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)

  const sendWebSocketMessage = useCallback((params: { [key: string]: any }) => {

    ws.current?.send(JSON.stringify(params))
  }, [])

  const sendPing = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      sendWebSocketMessage({action: "ping"})
      console.log("Ping sent to server")
    } else if (socketConnectionStatus !== ConnectionStatus.disconnected) {
      setSocketConnectionStatus(ConnectionStatus.disconnected)
    }
  }, [ sendWebSocketMessage, socketConnectionStatus ])

  const startPinging = useCallback(() => {
    pingInterval = setInterval(sendPing, 540000)
  }, [ sendPing ])

  const addWebSocketHandlers = useCallback(() => {
    if (!ws.current) {
      return
    }

    ws.current.onopen = async event => {
      startPinging()
      setSocketConnectionStatus(ConnectionStatus.connected)
    }

    ws.current.onerror = async event => {
      console.log('websocket error', event.target)
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data) as {
        type: string;
        value: unknown;
      }
      console.log(msg)
    }

    ws.current.onclose = async (event) => {
      console.log('on close', event)
      if (socketConnectionStatus === ConnectionStatus.disconnected) {
        return
      }
      handleOnSocketClose()
    }
  }, [ socketConnectionStatus, startPinging ])

  const handleOnSocketClose = () => {
    console.log('handleOnSocketClose')
    ws.current = undefined
    setSocketConnectionStatus(ConnectionStatus.disconnected)
    WebSocketProvider.closeConnection()
    clearInterval(pingInterval)
  }

  const openConnection = useCallback(async () => {
    if (!ws.current && document.visibilityState === 'visible') {
      ws.current = WebSocketProvider.getConnection('1234')
      addWebSocketHandlers()
    }
  }, [ addWebSocketHandlers ])

  const refreshWebsocketConnection = useCallback(async () => {
    const now = Date.now()
    if (now - lastReconnectTime.current < 3000) return

    console.log('refreshWebsocketConnection')
    lastReconnectTime.current = now
    try {
      setIsReconnectingWebSocket(true)
      ws.current = WebSocketProvider.getConnection('1234', true)
      addWebSocketHandlers()
      return socketConnectionStatus
    } finally {
      setIsReconnectingWebSocket(false)
    }
  }, [ addWebSocketHandlers, socketConnectionStatus ])

  const handleSynchronizationAfterWebsocketClose = useCallback(async () => {
    console.log('Tab is ' + document.visibilityState)

    if (debounceTimeout.current)
      clearTimeout(debounceTimeout.current)

    debounceTimeout.current = setTimeout(async () => {
      if (document.visibilityState === 'visible') {
        // If I dont know when the socket was closed, use the last communication time
        if (!websocketConnectionClosedAtTimestamp.current && lastCommunicationTimestamp.current) {
          websocketConnectionClosedAtTimestamp.current = lastCommunicationTimestamp.current
        }

        if (ws.current === undefined || (ws.current && ws.current.readyState !== WebSocket.OPEN)) {
          if (websocketConnectionClosedAtTimestamp.current && !isSyncingAfterDisconnect) {
            await refreshWebsocketConnection()
          }
        }
      }
    }, 300)
  }, [ isSyncingAfterDisconnect, refreshWebsocketConnection ])

  const handleSetReachabilityStatus = useCallback(async (newReachabilityStatus: ReachabilityStatus) => {
    setReachabilityStatus(newReachabilityStatus)
    switch (newReachabilityStatus) {
      case ReachabilityStatus.noInternet:
        closeWebSocket()
        break

      case ReachabilityStatus.internetReachable:
        console.log('internet Reachable')
        await handleSynchronizationAfterWebsocketClose()
    }
  }, [ handleSynchronizationAfterWebsocketClose ])

  useEffect(() => {
    window.addEventListener('beforeunload', closeWebSocket)

    return () => {
      window.removeEventListener('beforeunload', closeWebSocket)
    }
  }, [])

  useEffect(() => {
    async function updateOnlineStatus(_: Event) {
      const newStatus = navigator.onLine ? ReachabilityStatus.internetReachable : ReachabilityStatus.noInternet
      console.log(`The network connection status is: ${ newStatus }`)
      await handleSetReachabilityStatus(newStatus)
    }

    window.addEventListener('focus', handleSynchronizationAfterWebsocketClose)
    window.addEventListener('pageshow', handleSynchronizationAfterWebsocketClose)
    window.addEventListener('visibilitychange', handleSynchronizationAfterWebsocketClose)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener('focus', handleSynchronizationAfterWebsocketClose)
      window.removeEventListener("pageshow", handleSynchronizationAfterWebsocketClose)
      window.removeEventListener('visibilitychange', handleSynchronizationAfterWebsocketClose)
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [ handleSetReachabilityStatus, handleSynchronizationAfterWebsocketClose, isSyncingAfterDisconnect, openConnection ])

  const closeWebSocket = () => {
    console.log('closeWebSocket on unload')
    ws.current?.close()
  }

  return (
    <WebSocketContext.Provider
      value={ {
        refreshWebsocketConnection,
        reachabilityStatus,
        openConnection,
        closeWebSocket,
        isSyncingAfterDisconnect,
        isReconnectingWebSocket,
        socketConnectionStatus,
        setSocketConnectionStatus
      } }>
      { children }
    </WebSocketContext.Provider>
  )
}


export function useWebSocket(): WebSocketContextType {
  const context = useContext(WebSocketContext)
  context?.openConnection()
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
