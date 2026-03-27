import { create } from 'zustand'
import type { Node, Edge } from 'reactflow'
import type { WSEvent } from '../api/ws'

interface CanvasStore {
  nodes: Node[]
  edges: Edge[]
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  updateNodeStatus: (agentId: string, status: string) => void
  addEdge: (edge: Edge) => void
  handleWSEvent: (event: WSEvent) => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  nodes: [],
  edges: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes.filter((n) => n.id !== node.id), node] })),

  updateNodeStatus: (agentId, status) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === agentId ? { ...n, data: { ...n.data, status } } : n
      ),
    })),

  addEdge: (edge) =>
    set((state) => ({ edges: [...state.edges, edge] })),

  handleWSEvent: (event) => {
    set((state) => {
      switch (event.type) {
        case 'agent.status_changed': {
          const agentId = event.agent_id
          if (!agentId) return state
          const status = (event.payload as { to?: string }).to ?? 'idle'
          return {
            nodes: state.nodes.map((n) =>
              n.id === agentId ? { ...n, data: { ...n.data, status } } : n
            ),
          }
        }
        case 'subtask.delegated': {
          const { from_id, to_id } = event.payload as { from_id?: string; to_id?: string }
          if (!from_id || !to_id) return state
          const edgeId = `${from_id}-${to_id}-${Date.now()}`
          const newEdge: Edge = {
            id: edgeId,
            source: from_id,
            target: to_id,
            animated: true,
            style: { stroke: '#3b82f6' },
          }
          return { edges: [...state.edges, newEdge] }
        }
        default:
          return state
      }
    })
  },
}))
