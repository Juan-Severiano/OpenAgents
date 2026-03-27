import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { AgentNode } from './AgentNode'
import { useCanvasStore } from '../../stores/canvasStore'
import { useAgentStore } from '../../stores/agentStore'
import { canvasWS } from '../../api/ws'

const nodeTypes = { agentNode: AgentNode }

export function AgentCanvas() {
  const { agents, fetchAgents } = useAgentStore()
  const { handleWSEvent } = useCanvasStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

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
        <Background color="#334155" gap={24} />
        <Controls />
        <MiniMap nodeColor="#334155" maskColor="rgb(15, 23, 42, 0.8)" />
      </ReactFlow>
    </div>
  )
}
