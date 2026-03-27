import { useEffect, useRef, useState } from 'react'
import { createTaskSocket, type WSEvent } from '../api/ws'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export function useTaskSocket(taskId: string | null) {
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const clientRef = useRef<ReturnType<typeof createTaskSocket> | null>(null)

  useEffect(() => {
    if (!taskId) return

    const client = createTaskSocket(taskId)
    clientRef.current = client

    setStatus('connecting')

    const off = client.on((event) => {
      setLastEvent(event)
      setStatus('connected')
    })

    // Patch onopen/onclose to track connection status
    const originalConnect = client.connect.bind(client)
    client.connect = () => {
      setStatus('connecting')
      originalConnect()
    }

    client.connect()

    return () => {
      off()
      client.disconnect()
      setStatus('disconnected')
      clientRef.current = null
    }
  }, [taskId])

  return { lastEvent, status }
}
