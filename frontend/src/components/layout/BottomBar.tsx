import type { ElementType } from 'react'
import { Bot, CheckSquare, Cpu, Server, Settings, Wrench } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ThemeToggle } from '../ui/theme-toggle'

export type PanelView = 'agents' | 'tasks' | 'skills' | 'capabilities' | 'mcp' | 'settings'

const navItems: { id: PanelView; icon: ElementType; label: string }[] = [
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'skills', icon: Wrench, label: 'Skills' },
  { id: 'capabilities', icon: Cpu, label: 'Capabilities' },
  { id: 'mcp', icon: Server, label: 'MCP' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

interface BottomBarProps {
  activePanel: PanelView | null
  onSelect: (view: PanelView) => void
}

export function BottomBar({ activePanel, onSelect }: BottomBarProps) {
  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-0.5 rounded-2xl border border-border bg-card px-2 py-1.5 shadow-xl shadow-black/10 dark:shadow-black/40">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-medium transition-colors',
              activePanel === id
                ? 'bg-primary/10 text-primary dark:bg-primary/15'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </button>
        ))}
        <div className="mx-1.5 h-6 w-px bg-border" />
        <div className="flex items-center px-1">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
