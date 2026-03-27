export interface WSEvent {
  event_id: string
  type: string
  task_id?: string
  agent_id?: string
  payload: Record<string, unknown>
  timestamp: string
}

type EventHandler = (event: WSEvent) => void

export class WSClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers: EventHandler[] = []
  private reconnectDelay = 1000
  private maxReconnectDelay = 30_000
  private shouldReconnect = true
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    this.shouldReconnect = true
    this._connect()
  }

  private _connect(): void {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${proto}//${window.location.host}${this.url}`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      this.pingInterval = setInterval(() => {
        this.ws?.readyState === WebSocket.OPEN &&
          this.ws.send(JSON.stringify({ type: 'ping' }))
      }, 30_000)
    }

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as WSEvent
        if ((data as { type?: string }).type === 'pong') return
        this.handlers.forEach((h) => h(data))
      } catch {
        // ignore parse errors
      }
    }

    this.ws.onclose = () => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval)
        this.pingInterval = null
      }
      if (this.shouldReconnect) {
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
          this._connect()
        }, this.reconnectDelay)
      }
    }
  }

  on(handler: EventHandler): () => void {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.pingInterval) clearInterval(this.pingInterval)
    this.ws?.close()
  }
}

export const canvasWS = new WSClient('/ws/canvas')

export function createTaskSocket(taskId: string): WSClient {
  return new WSClient(`/ws/task/${taskId}`)
}
