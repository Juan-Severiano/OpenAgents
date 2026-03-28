import { cn } from '../../lib/utils'

// Persisted statuses from DB + transient activity overrides
export type AgentStatus = 'idle' | 'busy' | 'error' | 'disabled'

interface StatusBadgeProps {
  status: AgentStatus
  activity?: string
  className?: string
}

const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
  idle: {
    label: 'Idle',
    className: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
  },
  busy: {
    label: 'Busy',
    className:
      'bg-blue-100 text-blue-700 animate-pulse dark:bg-blue-900/40 dark:text-blue-300',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  disabled: {
    label: 'Disabled',
    className: 'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500',
  },
}

const activityLabel: Record<string, string> = {
  thinking: 'Thinking...',
  web_search: 'Searching...',
  calculator: 'Calculating...',
  code_executor: 'Running code...',
  http_request: 'Fetching...',
  file_reader: 'Reading...',
  datetime_info: 'Getting time...',
  synthesizing: 'Synthesizing...',
  decomposing: 'Decomposing...',
}

export function StatusBadge({ status, activity, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.idle
  const label = activity ? (activityLabel[activity] ?? `${activity}...`) : config.label
  const isActive = status === 'busy'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          : config.className,
        className
      )}
    >
      {isActive && (
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
      )}
      {label}
    </span>
  )
}
