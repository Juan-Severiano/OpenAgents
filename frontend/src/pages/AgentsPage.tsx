import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { agentsApi, type Agent, type AgentCreate } from '../api/agents'
import { providersApi } from '../api/providers'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  idle: 'secondary',
  busy: 'default',
  error: 'destructive',
  disabled: 'outline',
}

function CreateAgentDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AgentCreate>({
    name: '',
    role: 'specialist',
    system_prompt: 'You are a helpful AI agent.',
    llm_config_id: '',
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: () => providersApi.list(),
  })

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: AgentCreate) => agentsApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agents'] })
      onCreated()
      setOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orchestrator">Orchestrator</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="provider">LLM Provider</Label>
            <Select
              value={form.llm_config_id}
              onValueChange={(v) => setForm((f) => ({ ...f, llm_config_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              value={form.system_prompt}
              onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditAgentDialog({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<AgentCreate>({
    name: agent.name,
    role: agent.role,
    system_prompt: agent.system_prompt,
    llm_config_id: agent.llm_config_id ?? '',
    description: agent.description,
    max_iterations: agent.max_iterations,
    memory_enabled: agent.memory_enabled,
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: () => providersApi.list(),
    enabled: open,
  })

  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (data: Partial<AgentCreate>) => agentsApi.update(agent.id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agents'] })
      setOpen(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orchestrator">Orchestrator</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>LLM Provider</Label>
            <Select
              value={form.llm_config_id}
              onValueChange={(v) => setForm((f) => ({ ...f, llm_config_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>System Prompt</Label>
            <Textarea
              value={form.system_prompt}
              onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
              rows={4}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Max Iterations</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={form.max_iterations ?? 10}
              onChange={(e) => setForm((f) => ({ ...f, max_iterations: Number(e.target.value) }))}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AgentsPage() {
  const qc = useQueryClient()
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agents'] }),
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-sm text-muted-foreground">{agents.length} agents configured</p>
        </div>
        <CreateAgentDialog onCreated={() => void qc.invalidateQueries({ queryKey: ['agents'] })} />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{agent.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <EditAgentDialog agent={agent} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(agent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Badge variant={agent.role === 'orchestrator' ? 'warning' : 'secondary'}>
                  {agent.role}
                </Badge>
                <Badge variant={statusVariant[agent.status] ?? 'outline'}>{agent.status}</Badge>
              </div>
              {agent.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Max iterations: {agent.max_iterations}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
