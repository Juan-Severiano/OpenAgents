import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu, Pencil, Plus, Trash2 } from 'lucide-react'

import { agentsApi, type Agent, type AgentCreate } from '../api/agents'
import { providersApi } from '../api/providers'
import { skillsApi } from '../api/skills'
import { Button } from '../components/ui/button'
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
import { cn } from '../lib/utils'

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

function ManageSkillsDialog({ agent }: { agent: Agent }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const { data: allSkills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: () => skillsApi.list(),
    enabled: open,
  })

  const { data: assignedSkills = [] } = useQuery({
    queryKey: ['agent-skills', agent.id],
    queryFn: () => agentsApi.listSkills(agent.id),
    enabled: open,
  })

  const assignedIds = new Set(assignedSkills.map((s) => s.skill_id))

  const assignMutation = useMutation({
    mutationFn: (skill_id: string) => agentsApi.assignSkill(agent.id, skill_id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agent-skills', agent.id] }),
  })

  const removeMutation = useMutation({
    mutationFn: (skill_id: string) => agentsApi.removeSkill(agent.id, skill_id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agent-skills', agent.id] }),
  })

  const toggle = (skill_id: string, assigned: boolean) => {
    if (assigned) removeMutation.mutate(skill_id)
    else assignMutation.mutate(skill_id)
  }

  const isPending = assignMutation.isPending || removeMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Cpu className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skills — {agent.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {allSkills.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No skills available. Seed them by starting the server.
            </p>
          )}
          {allSkills.map((skill) => {
            const assigned = assignedIds.has(skill.id)
            return (
              <div
                key={skill.id}
                className={`flex items-center justify-between rounded-md border p-3 transition-colors ${
                  assigned ? 'border-primary/40 bg-primary/5' : 'border-border'
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{skill.display_name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{skill.description}</p>
                </div>
                <Button
                  size="sm"
                  variant={assigned ? 'destructive' : 'outline'}
                  onClick={() => toggle(skill.id, assigned)}
                  disabled={isPending}
                  className="ml-3 shrink-0"
                >
                  {assigned ? 'Remove' : 'Add'}
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AgentCard({ agent, onDelete }: { agent: Agent; onDelete: () => void }) {
  const isOrchestrator = agent.role === 'orchestrator'
  const accentBar = agent.status === 'error'
    ? 'bg-destructive'
    : agent.status === 'disabled'
      ? 'bg-muted'
      : isOrchestrator
        ? 'bg-primary'
        : 'bg-stone-400 dark:bg-stone-500'

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm leading-tight">{agent.name}</p>
            {agent.description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{agent.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <ManageSkillsDialog agent={agent} />
            <EditAgentDialog agent={agent} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-2 py-0.5',
              isOrchestrator && 'border-primary/40 text-primary bg-primary/5'
            )}
          >
            {agent.role}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
            {agent.status}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-2 py-0.5">
            {agent.max_iterations} iter
          </Badge>
        </div>
      </div>
      <div className={cn('h-1', accentBar)} />
    </div>
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

  const orchestrators = agents.filter((a) => a.role === 'orchestrator')
  const specialists = agents.filter((a) => a.role === 'specialist')

  return (
    <div>
      {/* Compact action bar */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </span>
        <CreateAgentDialog onCreated={() => void qc.invalidateQueries({ queryKey: ['agents'] })} />
      </div>

      <div className="p-4 space-y-5">
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>}

        {orchestrators.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Orchestrators</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {orchestrators.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onDelete={() => deleteMutation.mutate(agent.id)} />
              ))}
            </div>
          </section>
        )}

        {specialists.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Specialists</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {specialists.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onDelete={() => deleteMutation.mutate(agent.id)} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && agents.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No agents yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  )
}
