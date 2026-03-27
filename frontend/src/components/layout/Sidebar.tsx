import { NavLink } from 'react-router-dom'
import { Bot, CheckSquare, Cpu, LayoutDashboard, Server, Settings, Wrench } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ThemeToggle } from '../ui/theme-toggle'

const navItems = [
  { to: '/canvas', icon: LayoutDashboard, label: 'Canvas' },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/skills', icon: Wrench, label: 'Skills' },
  { to: '/capabilities', icon: Cpu, label: 'Capabilities' },
  { to: '/mcp', icon: Server, label: 'MCP Servers' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-lg font-bold text-primary">OpenAgents</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex h-12 items-center border-t border-border px-3">
        <ThemeToggle />
      </div>
    </aside>
  )
}
