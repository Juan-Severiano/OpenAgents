import { Handle, Position, type NodeProps } from 'reactflow'
import { StatusBadge } from './StatusBadge'
import { cn } from '../../lib/utils'
import type { Agent } from '../../api/agents'

type AgentNodeData = Pick<Agent, 'name' | 'role' | 'status'> & {
  messageCount?: number
}

export function AgentNode({ data, selected }: NodeProps<AgentNodeData>) {
  const isOrchestrator = data.role === 'orchestrator'

  return (
    <div
      className={cn(
        'min-w-[160px] rounded-lg border-2 bg-card p-3 shadow-lg transition-all',
        isOrchestrator ? 'border-orange-400' : 'border-amber-400',
        selected && 'ring-2 ring-primary ring-offset-2',
        data.status === 'busy' && 'shadow-blue-500/30 shadow-lg'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground truncate">{data.name}</span>
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium',
            isOrchestrator ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'
          )}
        >
          {isOrchestrator ? 'orch' : 'spec'}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <StatusBadge status={data.status ?? 'idle'} />
        {(data.messageCount ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground">{data.messageCount} msgs</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
}
