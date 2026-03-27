import { cn } from '../../lib/utils'

type AgentStatus = 'idle' | 'busy' | 'error' | 'disabled'

interface StatusBadgeProps {
  status: AgentStatus
  className?: string
}

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-gray-500 text-white' },
  busy: { label: 'Thinking', className: 'bg-blue-500 text-white animate-pulse' },
  error: { label: 'Error', className: 'bg-red-500 text-white' },
  disabled: { label: 'Disabled', className: 'bg-gray-700 text-gray-400' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.idle
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
