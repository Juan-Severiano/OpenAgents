import { useState } from 'react'
import { AgentCanvas } from '../canvas/AgentCanvas'
import { AgentsPage } from '../../pages/AgentsPage'
import { TasksPage } from '../../pages/TasksPage'
import { SkillsPage } from '../../pages/SkillsPage'
import { CapabilitiesPage } from '../../pages/CapabilitiesPage'
import { MCPPage } from '../../pages/MCPPage'
import { SettingsPage } from '../../pages/SettingsPage'
import { BottomBar, type PanelView } from './BottomBar'
import { SidePanel } from './SidePanel'

const panelTitles: Record<PanelView, string> = {
  agents: 'Agents',
  tasks: 'Tasks',
  skills: 'Skills',
  capabilities: 'Capabilities',
  mcp: 'MCP Servers',
  settings: 'Settings',
}

export function Layout() {
  const [activePanel, setActivePanel] = useState<PanelView | null>(null)

  const handleSelect = (view: PanelView) => {
    setActivePanel((prev) => (prev === view ? null : view))
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {/* Canvas always fills the screen */}
      <div className="h-full w-full">
        <AgentCanvas />
      </div>

      {/* Side panel slides in from right */}
      <SidePanel
        open={activePanel !== null}
        title={activePanel ? panelTitles[activePanel] : ''}
        onClose={() => setActivePanel(null)}
      >
        {activePanel === 'agents' && <AgentsPage />}
        {activePanel === 'tasks' && <TasksPage />}
        {activePanel === 'skills' && <SkillsPage />}
        {activePanel === 'capabilities' && <CapabilitiesPage />}
        {activePanel === 'mcp' && <MCPPage />}
        {activePanel === 'settings' && <SettingsPage />}
      </SidePanel>

      {/* Floating bottom navigation */}
      <BottomBar activePanel={activePanel} onSelect={handleSelect} />
    </div>
  )
}
