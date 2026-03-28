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

import { AgentNode, type AgentNodeData } from './AgentNode'
import { useAgentStore } from '../../stores/agentStore'
import { canvasWS, type WSEvent } from '../../api/ws'

const nodeTypes = { agentNode: AgentNode }

// Static dashed edge between orchestrator and specialist (always visible)
function staticEdge(orchId: string, specId: string): Edge {
  return {
    id: `static-${orchId}-${specId}`,
    source: orchId,
    target: specId,
    animated: false,
    style: { stroke: '#6b728066', strokeDasharray: '5 5' },
  }
}

// Animated edge when a subtask is actively delegated
function activeEdge(fromId: string, toId: string): Edge {
  return {
    id: `active-${fromId}-${toId}`,
    source: fromId,
    target: toId,
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  }
}

export function AgentCanvas() {
  const { resolvedTheme } = useTheme()
  const { agents, fetchAgents } = useAgentStore()
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Update a single node's data immutably
  const patchNode = useCallback(
    (agentId: string, patch: Partial<AgentNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === agentId ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      )
    },
    [setNodes],
  )

  const handleWSEvent = useCallback(
    (event: WSEvent) => {
      const agentId = event.agent_id

      switch (event.type) {
        case 'agent.status_changed': {
          if (!agentId) break
          const to = (event.payload as { to?: string }).to ?? 'idle'
          patchNode(agentId, {
            status: to as AgentNodeData['status'],
            // Clear transient activity when agent goes idle
            activity: to === 'idle' ? undefined : undefined,
          })
          break
        }

        case 'agent.thinking': {
          if (!agentId) break
          const preview = String(event.payload?.prompt_preview ?? '')
          // Detect synthesis vs decomposition from the preview text
          const activity = preview.toLowerCase().includes('synthesiz')
            ? 'synthesizing'
            : preview.toLowerCase().includes('decompos')
              ? 'decomposing'
              : 'thinking'
          patchNode(agentId, { status: 'busy', activity })
          break
        }

        case 'agent.tool_called': {
          if (!agentId) break
          const toolName = String(event.payload?.tool_name ?? 'tool')
          patchNode(agentId, { status: 'busy', activity: toolName })
          break
        }

        case 'agent.tool_result': {
          // After tool returns, go back to thinking state
          if (!agentId) break
          patchNode(agentId, { activity: 'thinking' })
          break
        }

        case 'agent.message_sent': {
          if (!agentId) break
          setNodes((prev) =>
            prev.map((n) =>
              n.id === agentId
                ? { ...n, data: { ...n.data, messageCount: (n.data.messageCount ?? 0) + 1 } }
                : n,
            ),
          )
          break
        }

        case 'subtask.delegated': {
          const { from_id, to_id } = event.payload as { from_id?: string; to_id?: string }
          if (!from_id || !to_id) break
          // Replace static edge with animated one
          setEdges((prev) => [
            ...prev.filter((e) => e.id !== `static-${from_id}-${to_id}`),
            activeEdge(from_id, to_id),
          ])
          break
        }

        case 'subtask.completed': {
          // Restore static edges when the subtask finishes
          setEdges((prev) =>
            prev.map((e) => {
              if (!e.id.startsWith('active-')) return e
              const [, from, to] = e.id.split('-')
              return staticEdge(from, to)
            }),
          )
          break
        }

        case 'task.completed':
        case 'task.failed': {
          // Reset all active edges back to static dashed
          setEdges((prev) =>
            prev.map((e) => {
              if (!e.id.startsWith('active-')) return e
              const parts = e.id.split('-')
              return staticEdge(parts[1], parts[2])
            }),
          )
          break
        }
      }
    },
    [patchNode, setNodes, setEdges],
  )

  // Connect canvas WS on mount
  useEffect(() => {
    void fetchAgents()
    canvasWS.connect()
    const unsub = canvasWS.on(handleWSEvent)
    return () => {
      unsub()
      canvasWS.disconnect()
    }
  }, [fetchAgents, handleWSEvent])

  // Rebuild nodes + static edges whenever agent list changes (on load or manual refresh)
  useEffect(() => {
    const orchestrators = agents.filter((a) => a.role === 'orchestrator')
    const specialists = agents.filter((a) => a.role === 'specialist' && a.status !== 'disabled')

    const newNodes: Node<AgentNodeData>[] = agents.map((agent, i) => ({
      id: agent.id,
      type: 'agentNode',
      position: { x: 220 * (i % 4), y: 160 * Math.floor(i / 4) },
      data: {
        name: agent.name,
        role: agent.role,
        status: agent.status,
        messageCount: 0,
      },
    }))
    setNodes(newNodes)

    // Static dashed edges: every orchestrator → every active specialist
    const staticEdges: Edge[] = []
    orchestrators.forEach((orch) => {
      specialists.forEach((spec) => {
        staticEdges.push(staticEdge(orch.id, spec.id))
      })
    })
    setEdges(staticEdges)
  }, [agents, setNodes, setEdges])

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
          maskColor={
            resolvedTheme === 'dark'
              ? 'rgba(28,25,22,0.7)'
              : 'rgba(250,248,244,0.7)'
          }
        />
      </ReactFlow>
    </div>
  )
}
