import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { CanvasPage } from './pages/CanvasPage'
import { AgentsPage } from './pages/AgentsPage'
import { TasksPage } from './pages/TasksPage'
import { SkillsPage } from './pages/SkillsPage'
import { CapabilitiesPage } from './pages/CapabilitiesPage'
import { MCPPage } from './pages/MCPPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/canvas" replace />} />
          <Route path="/canvas" element={<CanvasPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/capabilities" element={<CapabilitiesPage />} />
          <Route path="/mcp" element={<MCPPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
