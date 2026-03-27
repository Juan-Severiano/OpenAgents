import { cn } from '../../lib/utils'

type AgentStatus = 'idle' | 'busy' | 'error' | 'disabled'

interface StatusBadgeProps {
  status: AgentStatus
  className?: string
}

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300' },
  busy: { label: 'Thinking', className: 'bg-orange-100 text-orange-700 animate-pulse dark:bg-orange-900/40 dark:text-orange-300' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  disabled: { label: 'Disabled', className: 'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500' },
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
