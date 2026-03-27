import { useCallback, useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { AgentNode } from './AgentNode'
import { useAgentStore } from '../../stores/agentStore'
import { canvasWS, type WSEvent } from '../../api/ws'

const nodeTypes = { agentNode: AgentNode }

export function AgentCanvas() {
  const { resolvedTheme } = useTheme()
  const { agents, fetchAgents } = useAgentStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Handle WS events directly against ReactFlow state
  const handleWSEvent = useCallback(
    (event: WSEvent) => {
      if (event.type === 'agent.status_changed') {
        const agentId = event.agent_id
        const status = (event.payload as { to?: string }).to ?? 'idle'
        if (!agentId) return
        setNodes((prev) =>
          prev.map((n) => (n.id === agentId ? { ...n, data: { ...n.data, status } } : n))
        )
      } else if (event.type === 'subtask.delegated') {
        const { from_id, to_id } = event.payload as { from_id?: string; to_id?: string }
        if (!from_id || !to_id) return
        const newEdge: Edge = {
          id: `${from_id}-${to_id}-${Date.now()}`,
          source: from_id,
          target: to_id,
          animated: true,
          style: { stroke: '#3b82f6' },
        }
        setEdges((prev) => [...prev, newEdge])
      }
    },
    [setNodes, setEdges]
  )

  useEffect(() => {
    void fetchAgents()
    canvasWS.connect()
    const unsub = canvasWS.on(handleWSEvent)
    return () => {
      unsub()
      canvasWS.disconnect()
    }
  }, [fetchAgents, handleWSEvent])

  useEffect(() => {
    const newNodes: Node[] = agents.map((agent, i) => ({
      id: agent.id,
      type: 'agentNode',
      position: { x: 200 * (i % 4), y: 150 * Math.floor(i / 4) },
      data: {
        name: agent.name,
        role: agent.role,
        status: agent.status,
        messageCount: 0,
      },
    }))
    setNodes(newNodes)
  }, [agents, setNodes])

  const onConnect = useCallback(() => {}, [])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background
          color={resolvedTheme === 'dark' ? '#2e2b27' : '#d6cfc6'}
          gap={24}
        />
        <Controls />
        <MiniMap
          nodeColor={resolvedTheme === 'dark' ? '#3a3632' : '#c9c1b8'}
          maskColor={resolvedTheme === 'dark' ? 'rgba(28,25,22,0.7)' : 'rgba(250,248,244,0.7)'}
        />
      </ReactFlow>
    </div>
  )
}
