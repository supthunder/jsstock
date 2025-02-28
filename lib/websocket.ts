import { POLYGON_API_KEY } from './utils'

type WebSocketCallback = (data: any) => void
type WebSocketSubscription = { unsubscribe: () => void }

class StockWebSocket {
  private ws: WebSocket | null = null
  private subscribers: Map<string, Set<WebSocketCallback>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private isDevelopment = process.env.NODE_ENV === 'development'

  constructor() {
    // Only auto-connect in production
    if (!this.isDevelopment) {
      this.connect()
    } else {
      console.log('WebSocket disabled in development mode to prevent console spam')
    }
  }

  private connect() {
    // Prevent multiple connection attempts
    if (this.isConnecting || this.ws?.readyState === WebSocket.CONNECTING || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(`wss://socket.polygon.io/stocks`)

      this.ws.onopen = () => {
        this.isConnecting = false
        console.log('WebSocket Connected')
        this.ws?.send(JSON.stringify({
          action: "auth",
          params: POLYGON_API_KEY
        }))
        this.reconnectAttempts = 0
        
        // Resubscribe to all symbols
        for (const symbol of this.subscribers.keys()) {
          this.subscribe(symbol)
        }
      }

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.ev === 'T') { // Trade event
          const symbol = data.sym
          const callbacks = this.subscribers.get(symbol)
          callbacks?.forEach(callback => callback(data))
        }
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        console.log('WebSocket Disconnected')
        
        // In development, don't auto-reconnect to avoid console spam
        if (!this.isDevelopment && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++
            this.connect()
          }, this.reconnectDelay * this.reconnectAttempts)
        }
      }

      this.ws.onerror = (error) => {
        this.isConnecting = false
        console.error('WebSocket Error:', error)
      }
    } catch (error) {
      this.isConnecting = false
      console.error('Error initializing WebSocket:', error)
    }
  }

  private subscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: "subscribe",
        params: `T.${symbol}`
      }))
    }
  }

  private unsubscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: "unsubscribe",
        params: `T.${symbol}`
      }))
    }
  }

  public addSymbolSubscriber(symbol: string, callback: WebSocketCallback): WebSocketSubscription {
    // In development, don't actually create a WebSocket connection
    if (this.isDevelopment) {
      return {
        unsubscribe: () => {}
      }
    }

    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set())
      // If the WebSocket isn't connected yet, connect it
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.connect()
      } else {
        this.subscribe(symbol)
      }
    }
    
    this.subscribers.get(symbol)?.add(callback)

    return {
      unsubscribe: () => {
        const callbacks = this.subscribers.get(symbol)
        if (callbacks) {
          callbacks.delete(callback)
          if (callbacks.size === 0) {
            this.subscribers.delete(symbol)
            this.unsubscribe(symbol)
          }
        }
      }
    }
  }

  public disconnect() {
    this.ws?.close()
  }
}

export const stockWebSocket = new StockWebSocket() 