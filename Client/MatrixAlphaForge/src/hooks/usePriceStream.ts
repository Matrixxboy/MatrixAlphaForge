import { useEffect, useState, useCallback, useRef } from "react"

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `ws://${window.location.hostname}:8000/api/ws/prices`

export interface PriceUpdate {
  ticker: string
  price: number
  change: string
  positive: boolean
}

export const usePriceStream = (initialTickers: string[] = []) => {
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<number | null>(null)
  const [reconnectTrigger, setReconnectTrigger] = useState(0)
  const subscriptions = useRef<Set<string>>(new Set(initialTickers))

  const subscribe = useCallback((tickers: string[]) => {
    tickers.forEach((t) => subscriptions.current.add(t))
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "SUBSCRIBE", data: tickers }))
    }
  }, [])

  const unsubscribe = useCallback((tickers: string[]) => {
    tickers.forEach((t) => subscriptions.current.delete(t))
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "UNSUBSCRIBE", data: tickers }))
    }
  }, [])

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    console.log(`Connecting to Price Stream at ${WS_URL}...`)
    const socket = new WebSocket(WS_URL)

    socket.onopen = () => {
      console.log("Price Stream Connected")
      setIsConnected(true)
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }

      // Resubscribe to everything we were watching
      const currentSubs = Array.from(subscriptions.current)
      if (currentSubs.length > 0) {
        socket.send(JSON.stringify({ type: "SUBSCRIBE", data: currentSubs }))
      }
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        if (message.type === "PRICE_UPDATE") {
          setPriceUpdates(message.data)
        }
      } catch (error) {
        console.error("Error parsing price update:", error)
      }
    }

    socket.onclose = () => {
      console.log("Price Stream Disconnected")
      setIsConnected(false)
      // Attempt to reconnect after 5 seconds
      reconnectTimeout.current = window.setTimeout(() => {
        setReconnectTrigger((prev) => prev + 1)
      }, 5000)
    }

    socket.onerror = (error) => {
      console.error("Price Stream WebSocket Error:", error)
      socket.close()
    }

    ws.current = socket
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close()
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
      }
    }
  }, [connect, reconnectTrigger])

  return { priceUpdates, isConnected, subscribe, unsubscribe }
}
